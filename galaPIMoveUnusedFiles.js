/*:
-------------------------------------------------------------------------
@title 未使用メディアデータ移動プラグイン(ver.1.01)
@author galanti
@date 2015/11/23
-------------------------------------------------------------------------
@plugindesc ゲームで未使用の音声、画像をunusedフォルダに移動させます。元の位置に復元もできます。

@param Check Sounds
@desc ゲームで使用されていないBGM、BGS、SE、MEを移動させます。(1:オン/0:オフ)
@default 1

@param Check Images
@desc ゲームで使用されていない画像素材を移動させます。(1:オン/0:オフ)
@default 1

@param Check Animations
@desc ゲームで使用されていないアニメーションのリストがコンソールに表示されます。消去はしません。(1:オン/0:オフ)
@default 1

@param Search In Plugins
@desc 各種ファイルがプラグインの中で使用されてるかチェックします。このチェックは完璧ではありません。(1:オン/0:オフ)
@default 0

@param Recover All
@desc unusedフォルダにあるすべてのファイルを元の位置に復元し、移動処理を中止します。(1:オン/0:オフ)
@default 0

@help 
-------------------------------------------------------------------------
○　概要
RPGツクールMVではランタイムパッケージ(RTP)が廃止され、デフォルト素材がすべてゲームに
同梱されるようになりました。同梱素材はサイズが非常に大きく、このまま配布すれば、たとえ
ミニゲームであってもゲームサイズが数百MBに達します。

このプラグインはゲームのシステムデータ、マップデータをすべてチェックし、使用されていない音声、画像ファイルは
すべて「Unused」というフォルダに移動させます。

また、プラグインをチェックするオプションをオンにしていれば、プラグイン内で素材が使われていないか
ひととおりのチェックを行います。
ただしプラグインチェックは完璧ではありません。プラグイン内で使用される素材についてはご自分で
再チェックを行うことをお勧めします。
また、イベントコマンドやコモンイベントの「スクリプト」の中身、システムのメモ欄もチェックしません。
これらは手動でチェックする必要があります。

○　使用条件
・　商用、非商用にかかわらずフリーでお使いいただけます。
・　クレジット表記についてはお任せします。

○　免責事項
このプラグイン使用によりいかなる損害が生じても作者は一切責任を負いません。
自己責任でお使いください。

○　更新情報
2015/11/13 ver.1.0
2015/11/23 ver.1.01 マップデータのキャラクターチップが検出できないバグ修正
 
○　使用法
プラグイン管理、パラメータの項目で実行したい項目を「1」にしてください。
「0」に設定するとその項目は実行されません。
プラグインの内部もチェックしたいときはSearch In Pluginsも「1」にしてください。
ゲームをテスト実行すればタイトルが始まる前に移動処理を行います。
もしRecover Allが「1」になっていた場合、unusedにあるすべてのファイルを
元の位置に復元し、処理をストップします。たとえ他の項目が「1」になっていても
これ以上の移動処理は行いません。

！注意！
デフォルトで用意されるフォルダ（例: img/picturesなど）の中にサブフォルダを
作っている場合、サブフォルダの中にあるファイルはチェックしません。

-------------------------------------------------------------------------
 */ 
var Imported = Imported || {};
var galaPI = galaPI || {};
Imported.moveUnusedMaterials = true;
galaPI.moveUnusedMaterials = galaPI.moveUnusedMaterials || {};


(function($){
	$.parameters = PluginManager.parameters("galaPIMoveUnusedFiles");
	$.isAudioCheck = Number($.parameters['Check Sounds']);
	$.isImageCheck = Number($.parameters['Check Images']);
	$.isanimCheck = Number($.parameters['Check Animations']);
	$.isPluginCheck = Number($.parameters['Search In Plugins']);
	$.isRecover = Number($.parameters['Recover All']);
	$.scriptText = "";
	$.audioPath = []; $.audioUnusedPath = [];
	$.imagePath = []; $.imageUnusedPath = [];
	$.animPath = ""; $.animUnusedPath = "";
	$.audioLists = []; $.audioUnusedLists = [];
	$.imageLists = []; $.imageUnusedLists = [];
	$.animList = []; $.animUnusedLists = [];
	$.fs = require('fs');
	
	//本体
	$.moveUnused = function(){
		$.registerFilePaths();		//すべてのパスを取得しておく
		$.makeUnusedFolders();		//unusedフォルダを作る
		if($.isRecover){
			$.recoverAllFiles();
			return;
		}
		$.moveUnusedFiles();
		if($.isanimCheck){
			$.showUnusedAnimations();
		}
	};

	//パスを登録
	$.registerFilePaths = function(){
		$.cpath = decodeURI(window.location.pathname.replace(/index\.html/,"").slice(1));
		$.audioPath[0] = $.cpath+"audio/bgm/";
		$.audioPath[1] = $.cpath+"audio/bgs/";
		$.audioPath[2] = $.cpath+"audio/se/";
		$.audioPath[3] = $.cpath+"audio/me/";
		for(var i = 0; i < $.audioPath.length; i++){
			$.audioUnusedPath[i] = $.audioPath[i].replace(/audio/,"unused/audio");
		}
		$.imagePath[0] = $.cpath+"img/battlebacks1/";
		$.imagePath[1] = $.cpath+"img/battlebacks2/";
		$.imagePath[2] = $.cpath+"img/characters/";
		$.imagePath[3] = $.cpath+"img/sv_actors/";
		$.imagePath[4] = $.cpath+"img/enemies/";
		$.imagePath[5] = $.cpath+"img/faces/";
		$.imagePath[6] = $.cpath+"img/tilesets/";
		$.imagePath[7] = $.cpath+"img/parallaxes/";
		$.imagePath[8] = $.cpath+"img/animations/";
		$.imagePath[9] = $.cpath+"img/pictures/";
		$.imagePath[10] = $.cpath+"img/titles1/";
		$.imagePath[11] = $.cpath+"img/titles2/";
		for(i = 0; i < $.imagePath.length; i++){
			$.imageUnusedPath[i] = $.imagePath[i].replace(/img/,"unused/img");
		}
		$.animPath = $.cpath+"img/animations/";
	};


	//unusedフォルダを作成
	$.makeUnusedFolders = function(){
		if(!$.fs.existsSync($.cpath+'unused/')){
			$.fs.mkdirSync($.cpath+'unused/');
		}
		if(!$.fs.existsSync($.cpath+'unused/audio')){
			$.fs.mkdirSync($.cpath+'unused/audio');
		}
		if(!$.fs.existsSync($.cpath+'unused/img')){
			$.fs.mkdirSync($.cpath+'unused/img');
		}
		for (var i = 0; i < $.audioUnusedPath.length; i++){
			if(!$.fs.existsSync($.audioUnusedPath[i])){
				$.fs.mkdirSync($.audioUnusedPath[i]);
			}
		}
		for (i = 0; i < $.imageUnusedPath.length; i++){
			if(!$.fs.existsSync($.imageUnusedPath[i])){
				$.fs.mkdirSync($.imageUnusedPath[i]);
			}
		}
	};


	//現在フォルダにあるメディアファイルのリストを取得
	$.getFileLists = function(mode, path, trim){
		trim = (typeof trim !== 'undefined')? trim : true;
		var tmplist = []; var list = [];
		var i,j;
		for (i = 0; i < path.length; i++){
			list[i] = [];
			tmplist = $.fs.readdirSync(path[i]);
			tmplist.forEach(function(file){
				if(!$.fs.statSync(path[i]+file).isDirectory()){
					if(trim){
						file = file.slice(0,-4);
					}
					list[i].push(file);
				}
			});
			if(mode === 'audio'){	//oggとm4aがあるのでまとめる
				list[i] = list[i].filter($.uniq);
 			}
		}
		return list;
	};


	//使用ファイル記録用の配列を準備
	$.prepareUsedDataList = function(num){
		array = [];
		for (var i = 0; i < num; i++){
			array[i] = [];
		}
		return array;
	};


	//uniq関数
	$.uniq = function(x, j, self){
		return self.indexOf(x) === j;
	};


	//ゲーム中使用されない音声、画像素材をすべて移動させます。
	$.moveUnusedFiles = function(){
		//使用ファイル記録用配列と今存在するファイルのリストを作成
		if($.isAudioCheck){
			$.usedAudioData = $.prepareUsedDataList(4);
			$.audioLists = $.getFileLists('audio',$.audioPath);
		}
		if($.isImageCheck){
			$.usedImageData = $.prepareUsedDataList(12);
			$.imageLists = $.getFileLists('image',$.imagePath);
		}
		//チェックスタート
		$.checkActorsImage($.isImageCheck);//アクターデータ
		$.checkEnemiesImage($.isImageCheck); //敵データ
		$.checkTilesetsImage($.isImageCheck); //タイルセットデータ
		$.checkTroops($.isAudioCheck,$.isImageCheck);
		$.checkAnimations($.isAudioCheck,$.isImageCheck);　//アニメーションデータ
		$.checkCommonEvents($.isAudioCheck,$.isImageCheck);　//コモンイベントデータ
		$.checkSystem($.isAudioCheck,$.isImageCheck);　//システムデータ
		$.checkMaps($.isAudioCheck,$.isImageCheck);　//マップ情報データ
		if ($.isPluginCheck){
			$.checkPlugins($.isAudioCheck,$.isImageCheck);　//プラグイン内チェック。これは完璧ではありません。
		}
		//これまで得た情報を元に音声ファイルを移動。
		if($.isAudioCheck){
			for(i = 0; i < $.usedAudioData.length; i++){
				$.usedAudioData[i] = $.usedAudioData[i].filter($.uniq);
			}
			$.moveAudioFiles();
		}
		//これまで得た情報を元に画像ファイルを移動。
		if($.isImageCheck){
			for(i = 0; i < $.usedImageData.length; i++){
				$.usedImageData[i] = $.usedImageData[i].filter($.uniq);
			}
			$.moveImageFiles();
		}
	};


	//アクターの画像をチェック
	$.checkActorsImage = function(isIm){
		if(!isIm){ return; }
		$dataActors.forEach(function(actor){
			if(actor){
				if(actor.battlerName != ""){
					$.usedImageData[3].push(actor.battlerName); //sv_actors
				}
				if(actor.characterName != ""){
					$.usedImageData[2].push(actor.characterName); //characters
				}
				if(actor.faceName != ""){
					$.usedImageData[5].push(actor.faceName); //faces
				}
			}
		});
	};


	//敵の画像をチェック
	$.checkEnemiesImage = function(isIm){
		if(!isIm){ return; }
		$dataEnemies.forEach(function(enemy){
			if(enemy){
				if(enemy.battlerName != ""){
					$.usedImageData[4].push(enemy.battlerName); //sv_enemies,enemies
				}
			}
		});
	};


	//タイルセットの画像をチェック
	$.checkTilesetsImage = function(isIm){
		if(!isIm){ return; }
		$dataTilesets.forEach(function(tset){
			if(tset){
				tset.tilesetNames.forEach(function(tile){
					if(tile != ""){
						$.usedImageData[6].push(tile); //tilesets
					}
				});
			}
		});
	};


	//敵集団データに登録されたイベントをチェック
	$.checkTroops = function(isAu, isIm){
		$dataTroops.forEach(function(troop){
			if(troop){
				troop.pages.forEach(function(page){
					page.list.forEach(function(act){
						if(isAu){ $.checkEventAudio(act); }
						if(isIm){ $.checkEventImage(act); }
					});
				});
			}
		});
	};


	//アニメーションをチェック
	$.checkAnimations = function(isAu, isIm){
		$dataAnimations.forEach(function(anim){
			if(anim && isAu && anim.timings){
				anim.timings.forEach(function(timing){
					if(timing && timing.se){
						$.usedAudioData[2].push(timing.se.name);
					}
				});
			}	
			if(anim && isIm){
				if(anim.animation1Name != ""){
						$.usedImageData[8].push(anim.animation1Name); //animations
				}
				if(anim.animation2Name != ""){
						$.usedImageData[8].push(anim.animation2Name); //animations
				}
			}
		});
	};


	//コモンイベントをチェック
	$.checkCommonEvents = function(isAu, isIm){
		$dataCommonEvents.forEach(function(event){
			if(event){
				event.list.forEach(function(act){
					if(isAu){ $.checkEventAudio(act); }
					if(isIm){ $.checkEventImage(act); }
				});
			}
		});
	};


	//イベントコマンドの音声をチェック。スクリプトコマンドはチェックしません。
	$.checkEventAudio = function(act){
		if((act.code == 241 || act.code == 132) && act.parameters[0].name != ""){
			$.usedAudioData[0].push(act.parameters[0].name);
		}else if(act.code == 245 && act.parameters[0].name != ""){
			$.usedAudioData[1].push(act.parameters[0].name);
		}else if(act.code == 256 && act.parameters[0].name != ""){
			$.usedAudioData[2].push(act.parameters[0].name);
		}else if((act.code == 246 || act.code == 133) && act.parameters[0].name != ""){
			$.usedAudioData[3].push(act.parameters[0].name);
		}else if(act.code == 505 && act.parameters[0].code == 44 &&
			act.parameters[0].parameters[0].name != ""){
			$.usedAudioData[2].push(act.parameters[0].parameters[0].name);
		}
	};


	//イベントコマンドの画像をチェック。スクリプトコマンドはチェックしません。
	$.checkEventImage = function(act){
		if(act.code == 101 && act.parameters[0] != ""){
			$.usedImageData[5].push(act.parameters[0]);
		}else if(act.code == 231 && act.parameters[1] != ""){
			$.usedImageData[9].push(act.parameters[1]);
		}else if(act.code == 322){
			if(act.parameters[1] != ""){
				$.usedImageData[2].push(act.parameters[1]);
			}
			if(act.parameters[3] != ""){
				$.usedImageData[5].push(act.parameters[3]);
			}
		}else if(act.code == 323 && act.parameters[1] != ""){
			$.usedImageData[2].push(act.parameters[1]);
		}else if(act.code == 283){
			if(act.parameters[0] != ""){
				$.usedImageData[0].push(act.parameters[0]);
			}
			if(act.parameters[1] != ""){
				$.usedImageData[1].push(act.parameters[1]);
			}
		}else if(act.code == 284 && act.parameters[0] != ""){
			$.usedImageData[7].push(act.parameters[0]);
		}else if(act.code == 505 && act.parameters[0].code == 41 &&
			act.parameters[2].parameters[0] != ""){
			$.usedImageData[2].push(act.parameters[2].parameters[0]);
		}
	};

	//システム設定をチェック
	$.checkSystem = function(isAu, isIm){
		if(isAu){
			$.checkSystemAudio();
		}
		if(isIm){
			$.checkSystemImage();
		}
	};


	//システム設定内の音声をチェック
	$.checkSystemAudio = function(){
		if($dataSystem.airship.bgm.name !== ""){
			$.usedAudioData[0].push($dataSystem.airship.bgm.name);
		}
		if($dataSystem.battleBgm.name !== ""){
			$.usedAudioData[0].push($dataSystem.battleBgm.name);
		}
		if($dataSystem.boat.bgm.name !== ""){
			$.usedAudioData[0].push($dataSystem.boat.bgm.name);
		}
		if($dataSystem.defeatMe.name !== ""){
			$.usedAudioData[3].push($dataSystem.defeatMe.name);
		}
		if($dataSystem.gameoverMe.name !== ""){
			$.usedAudioData[3].push($dataSystem.gameoverMe.name);
		}
		if($dataSystem.ship.bgm.name !== ""){
			$.usedAudioData[0].push($dataSystem.ship.bgm.name);
		}
		$dataSystem.sounds.forEach(function(sound){
			if(sound.name !== ""){
  				$.usedAudioData[2].push(sound.name);
			}
		});
		if($dataSystem.titleBgm.name !== ""){
			$.usedAudioData[0].push($dataSystem.titleBgm.name);
		}
		if($dataSystem.victoryMe.name !== ""){
			$.usedAudioData[3].push($dataSystem.victoryMe.name);
		}
	};
	
	
	//システム設定内の画像をチェック
	$.checkSystemImage = function(){
		if($dataSystem.airship.characterName != ""){
			$.usedImageData[2].push($dataSystem.airship.characterName); //characters
		}
		if($dataSystem.boat.characterName != ""){
			$.usedImageData[2].push($dataSystem.boat.characterName); //characters
		}
		if($dataSystem.ship.characterName != ""){
			$.usedImageData[2].push($dataSystem.ship.characterName); //characters
		}
		if($dataSystem.battleback1Name != ""){
			$.usedImageData[0].push($dataSystem.battleback1Name); //battlebacks1
		}
		if($dataSystem.battleback2Name != ""){
			$.usedImageData[1].push($dataSystem.battleback2Name); //battlebacks1
		}
		if($dataSystem.battlerName != ""){
			$.usedImageData[4].push($dataSystem.battlerName); //enemies
		}
		if($dataSystem.title1Name != ""){
			$.usedImageData[10].push($dataSystem.title1Name); //titles1
		}
		if($dataSystem.title2Name != ""){
			$.usedImageData[11].push($dataSystem.title2Name); //titles2
		}
	};
	
	
	//全マップに含まれるデータとイベントをチェック
	$.checkMaps = function(isAu, isIm){
		var presentMaps = [];
		$dataMapInfos.forEach(function(map){
			if(map){
				presentMaps.push(map.name);
			}
		});
		//全マップを読み込んでチェック
		presentMaps.forEach(function(mapName){
			$.loadMapData(mapName+".json");
			if(isAu){
				if($dataMap.bgm.name !== ""){
					$.usedAudioData[0].push($dataMap.bgm.name);
				}
				if($dataMap.bgs.name !== ""){
					$.usedAudioData[1].push($dataMap.bgs.name);
				}
			}
			if(isIm){
				if($dataMap.battleback1Name !== ""){
					$.usedImageData[0].push($dataMap.battleback1Name);
				}
				if($dataMap.battleback2Name !== ""){
					$.usedImageData[1].push($dataMap.battleback2Name);
				}
				if($dataMap.parallaxName !== ""){
					$.usedImageData[7].push($dataMap.parallaxName);
				}
			}
			//イベント
			$.checkMapEvents(isAu,isIm);
		});
	};
	
	
	//現在開いているマップデータ内のすべてのイベントをチェック
	$.checkMapEvents = function(isAu,isIm){
		$dataMap.events.forEach(function(event){
			if(event){
				event.pages.forEach(function(page){
					if(page.image.characterName !== ""){
						$.usedImageData[2].push(page.image.characterName)
					}
					page.list.forEach(function(act){
						if(isAu){ $.checkEventAudio(act); }
						if(isIm){ $.checkEventImage(act); }
					});
				});
			}
		});
	};


	//プラグイン内でファイルが使われていないかをチェック
	$.checkPlugins = function(isAu, isIm){
		var content;
		var i;
		$plugins.forEach(function(plugin) {
       		if (plugin.status && plugin.name !== "galaPIMoveUnusedFiles") {
            	content = $.loadPluginAsText(plugin.name + '.js');
            	if(isAu){
					for(i = 0; i < $.audioLists.length; i++){
						$.audioLists[i].forEach(function(file){
							if($.isUsedInPlugin(content,file)){
								console.log(file+".ogg/m4aが"+plugin.name+".jsで使用されている可能性があります。");
								$.usedAudioData[i].push(file);
							}
						});
					}
				}
				if(isIm){
					for(i = 0; i < $.imageLists.length; i++){
						$.imageLists[i].forEach(function(file){
							if($.isUsedInPlugin(content,file)){
								console.log(file+".pngが"+plugin.name+".jsで使用されている可能性があります。");
								$.usedImageData[i].push(file);								
							}
						});
					}
				}
			}
	    });
	};


	//プラグインをテキストとして取得
	$.loadPluginAsText = function(src) {
    	var file = $.cpath + 'js/plugins/' + src;
        return $.fs.readFileSync(file, 'utf8');
	};


	//プラグインの中身を確認
	$.isUsedInPlugin = function(content,file){
		//各プラグインファイル内のテキストからファイル名をワードとして探し出すシンプルサーチ。
		//文字列操作によってファイル名が生成されている場合には対応できません。
		return (content.indexOf(file+"'") != -1 || content.indexOf(file+"\"") != -1);
	};



	//オーディオファイルを移動
	$.moveAudioFiles = function(){
		var lists;
		//オーディオフォルダからunusedフォルダへ
		for (var i = 0; i < $.usedAudioData.length; i++){
			$.audioLists[i].forEach(function(audio){
				if($.usedAudioData[i].indexOf(audio) == -1){
					$.fs.rename($.audioPath[i]+audio+".ogg",$.audioUnusedPath[i]+audio+".ogg");
					$.fs.rename($.audioPath[i]+audio+".m4a",$.audioUnusedPath[i]+audio+".m4a");
				}
			});
		}
		//unusedフォルダからオーディオフォルダへ
		lists = $.getFileLists('audio',$.audioUnusedPath);
		for (i = 0; i < $.usedAudioData.length; i++){
			//unusedファイル一覧を取得
			lists.forEach(function(audio){
				if($.usedAudioData[i].indexOf(audio) != -1){
					$.fs.rename($.audioUnusedPath[i]+audio+".ogg",$.audioPath[i]+audio+".ogg");
					$.fs.rename($.audioUnusedPath[i]+audio+".m4a",$.audioPath[i]+audio+".m4a");
				}
			});
		}		
	};


	//画像ファイルを移動
	$.moveImageFiles = function(){
		var lists;
		var svPath = $.imagePath[4].replace(/enemies/,"sv_enemies");
		var svUnusedPath = $.imageUnusedPath[4].replace(/enemies/,"sv_enemies");
		//画像フォルダからunusedフォルダへ
		for (var i = 0; i < $.usedImageData.length; i++){
			$.imageLists[i].forEach(function(image){
				if($.usedImageData[i].indexOf(image) == -1){
					$.fs.rename($.imagePath[i]+image+".png",$.imageUnusedPath[i]+image+".png");
					if(i == 4 && $.fs.existsSync(svPath+image+".png")){
						$.fs.rename(svPath+image+".png",svUnusedPath+image+".png");
					}
				}
			});
		}
		//unusedフォルダから画像フォルダへ
		lists = $.getFileLists('image',$.imageUnusedPath);
		for (i = 0; i < $.usedImageData.length; i++){
			//unusedファイル一覧を取得
			lists.forEach(function(image){
				if($.usedImageData[i].indexOf(image) != -1){
					$.fs.rename($.imageUnusedPath[i]+image+".png",$.imagePath[i]+image+".png");
					if(i == 4 && $.fs.existsSync(svUnusedPath+image+".png")){
							$.fs.rename(svUnusedPath+image+".png",svPath+image+".png");
					}
				}
			});
		}		
	};


	//すべてのファイルを元に戻す
	$.recoverAllFiles = function(){
		var svPath = $.imagePath[4].replace(/enemies/,"sv_enemies");
		var svUnusedPath = $.imageUnusedPath[4].replace(/enemies/,"sv_enemies");
		var alists = $.getFileLists('audio',$.audioUnusedPath,false);
		var ilists = $.getFileLists('image',$.imageUnusedPath,false);
		for (var i = 0; i < $.audioUnusedPath.length; i++){
			alists[i].forEach(function(file){
				$.fs.rename($.audioUnusedPath[i]+file,$.audioPath[i]+file);
			});
		}
		for (var i = 0; i < $.imageUnusedPath.length; i++){
			ilists[i].forEach(function(file){
				$.fs.rename($.imageUnusedPath[i]+file,$.imagePath[i]+file);
				if(i == 4 && $.fs.existsSync(svUnusedPath+file)){
					$.fs.rename(svUnusedPath+file, svPath+file);
				}
			});
		}
	};


	//ゲーム中使用されないアニメーションをリスト表示します。
	$.showUnusedAnimations = function(){
		$.usedAnimData = [];
		$.getAnimList();

		$.checkSkillAnim(); //スキルデータ。
		$.checkItemAnim(); //アイテムデータ。
		$.checkWeaponAnim(); //武器データ。
		$.checkTroopAnim(); //敵集団データ。
		$.checkCommonAnim(); //コモンイベントデータ。
		$.checkMapAnim();　//マップ情報データ。
		//プラグイン内は調べません
		
		//これまで得た情報を元にリストを作成、表示。
		$.usedAnimData = $.usedAnimData.filter($.uniq);
		$.usedAnimData.sort(function(a,b){
        	if( a < b ) return -1;
        	if( a > b ) return 1;
        	return 0;
		});
		var temp = [];
		for(var i = 0; i < $.animList.length; i++){
			temp.push(i);
		}
		var unusedAnimData = temp.filter(function(i){
			return $.usedAnimData.indexOf(i) < 0;
		});
		console.log("以下のアニメーションが使用されていません。");
		console.log("(プラグイン内で使用されているかどうかは不明です。)");
		for(var i = 1; i < unusedAnimData.length; i++){
			console.log($.animList[unusedAnimData[i]]);
		}
	};


	//現在登録されているアニメーションのリストを作成
	$.getAnimList = function(){
		for (var i = 0; i < $dataAnimations.length; i++){
			if($dataAnimations[i]){
				$.animList[i] = $dataAnimations[i].name;
			}
		}
	};


	//スキルに登録されたアニメーションをチェック
	$.checkSkillAnim = function(){
		$dataSkills.forEach(function(skill){
			if(skill && skill.animationId > 0){
				$.usedAnimData.push(skill.animationId);
			}
		});
	};


	//アイテムに登録されたアニメーションをチェック
	$.checkItemAnim = function(){
		$dataItems.forEach(function(item){
			if(item && item.animationId > 0){
				$.usedAnimData.push(item.animationId);
			}
		});
	};


	//武器に登録されたアニメーションをチェック
	$.checkWeaponAnim = function(){
		$dataWeapons.forEach(function(weapon){
			if(weapon && weapon.animationId > 0){
				$.usedAnimData.push(weapon.animationId);
			}
		});
	};


	//敵集団データに登録されたイベントをチェック
	$.checkTroopAnim = function(){
		$dataTroops.forEach(function(troop){
			if(troop){
				troop.pages.forEach(function(page){
					page.list.forEach(function(act){
						$.checkEventAnim(act);
					});
				});
			}
		});
	};


	//コモンイベントをチェック
	$.checkCommonAnim = function(){
		$dataCommonEvents.forEach(function(event){
			if(event){
				$.checkEventAnim(event);
			}
		});
	};


	//全マップに含まれるアニメーションをチェック
	$.checkMapAnim = function(){
		var presentMaps = [];
		$dataMapInfos.forEach(function(map){
			if(map){
				presentMaps.push(map.name);
			}
		});
		//全マップを読み込んで使用画像をチェック
		presentMaps.forEach(function(mapName){
			$.loadMapData(mapName+".json");
			//イベント
			$dataMap.events.forEach(function(event){
				if(event){
					event.pages.forEach(function(page){
						$.checkEventAnim(page);
					});
				}
			});
		});
	};


	//アニメーションイベントをチェック
	$.checkEventAnim = function(event){
		event.list.forEach(function(act){
			if(act.code == 212 && act.parameters[1] > 0){
				$.usedAnimData.push(act.parameters[1]);
			}
		});
	};


	//マップデータをロード
	$.loadMapData = function(src) {
    	var file = $.cpath + 'data/' + src;
    	var content = $.fs.readFileSync(file, 'utf8');
        $dataMap = JSON.parse(content);
	};


	//ブートシーン
	var galaPI_SceneBootStart = Scene_Boot.prototype.start;
	Scene_Boot.prototype.start = function() {
		$.moveUnused();
		galaPI_SceneBootStart.call(this);
	};


})(galaPI.moveUnusedMaterials);
