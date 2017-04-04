
var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },
  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
    setTimeout(function() {
      navigator.splashscreen.hide();}, 500);
  },

  onDeviceReady: function() {
    //ステータスバーの自動調整を無効にする
    ons.disableAutoStatusBarFill();

    //データベースのテーブルを構築する
    var db = utility.get_database();

    db.transaction(function(tx) {
      tx.executeSql('CREATE TABLE IF NOT EXISTS movie (id integer primary key, title text unique, tmdb_id integer unique, genre_id text, onomatopoeia_id text, poster text, dvd integer, fav integer)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS genre (id integer primary key, name text unique)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS onomatopoeia (id integer primary Key, name text)');
    }, function(err) {
      console.log('Open database ERROR: ' +JSON.stringify(err) +' ' + err.message);
    });
    // db_method.delete_all_record();
  },
};


/**
* indexで使用する関数をまとめたオブジェクト
* @type {Object}
*/
var index = {
  formcheck: [false,false],                 //[0]はユーザ名とパスワード、[1]は生年月日に対応している
  
  /**
   * サインアップしているかを確認する
   */
  check_signup: function(){
    var storage = window.localStorage;
    var signup_flag = storage.getItem('signup_flag');

    //ユーザ情報が登録されている場合は自動ログインを行う
    if (signup_flag == 'true') {
      movie.draw_movie_content();
    //ユーザ情報が登録されていない場合はsignupへ遷移
    }else {
      utility.pushpage('signup.html','fade',1000);
      
      //イベント登録
      var addevent = function(){
        document.getElementById('username').addEventListener('keyup',index.check_usernameAndpassword_form);
        document.getElementById('password').addEventListener('keyup',index.check_usernameAndpassword_form);
      };
      utility.check_page_init('signup',addevent);
    }
  },

  /**
   * ユーザ名とパスワード入力フォームのkeyupイベントが起きるたびに入力文字数を確認する
   */
  check_usernameAndpassword_form: function(){
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    if (username.length === 0 || password.length < 6) {
      index.formcheck[0] = false;
    }else{
      index.formcheck[0] = true;
    }
    
    index.change_abled_signup_button();
  },

  /**
   * formcheck配列を確認して全てtrueならボタンをabledに、そうでなければdisabledにする
   */
  change_abled_signup_button: function(){
    if (index.formcheck[0] === true && index.formcheck[1] === true) {
      document.getElementById('signup_button').removeAttribute('disabled');
    }else{
      document.getElementById('signup_button').setAttribute('disabled');
    }
  },
};


/**
* サインアップ画面で使用する関数をまとめたオブジェクト
* @type {Object}
*/
var Signup = {
  usersignup: function() {
    //mobile backendアプリとの連携
    var ncmb = utility.get_ncmb();
    var user = new ncmb.User();

    //性別のチェック状態を確認
    var sex = Signup.get_sex();

    //ユーザー名・パスワードを設定
    user.set('userName', document.getElementById('username').value)
    .set('password', document.getElementById('password').value)
    .set('birthday', Number(document.getElementById('birthday').value))
    .set('sex', sex);

    // 新規登録
    user.signUpByAccount().then(function(){
      /*登録後処理*/
      //ローカルにユーザ名とパスワードを保存する。
      var username = document.getElementById('username').value;
      var password = document.getElementById('password').value;
      var birthday = Number(document.getElementById('birthday').value);
      var sex = Signup.get_sex();

      var storage = window.localStorage;
      storage.setItem('username', username);
      storage.setItem('password', password);
      storage.setItem('birthday', birthday);
      storage.setItem('sex', sex);

      //同時にこれらの情報が記録されているかを判断するフラグも保存する
      storage.setItem('signup_flag', true);

      document.getElementById('signup-alert-success').show();
    })
    .catch(function(err){
      // エラー処理
      document.getElementById('signup-alert-error').show();

      var info = document.getElementById('error-message');
      var textNode;

      if (err.name == "NoUserNameError") {
        textNode = document.createTextNode('ユーザ名を入力してください');
      }else if (err.name == "NoPasswordError") {
        textNode = document.createTextNode('パスワードを入力してください');
      }else if (err.message.indexOf('cannot POST') > -1) {
        textNode = document.createTextNode('入力したユーザ名は既に使用されています');
      }else if (err.message.indexOf('Request has been terminated') > -1) {
        textNode = document.createTextNode('ネットワーク接続がオフラインのため登録ができません');
      }
      info.appendChild(textNode);
    });
  },

  alert_hide: function(id) {
    //成功時にはindex.htmlへ遷移
    if (id == 'signup-alert-success') {
      var pushpage_tabbar = function(){
        function autoLink(){
            location.href='index.html';
        }
       setTimeout(autoLink(),0);
      };

      document.getElementById(id).hide(pushpage_tabbar());

    //追加したエラーメッセージ(子ノード)を削除する
    }else if (id == 'signup-alert-error') {
      document.getElementById(id).hide();
      var info = document.getElementById('error-message');
      var childNode = info.firstChild;
      info.removeChild(childNode);
    }
  },

  /**
   * 生年月日を選択させるフォーム
   */
  birthday_pickerview: function(){
    cordova.plugins.Keyboard.close();

    //今年から100年前までの年テキストをオブジェクトとして生成する
    var birthday = document.getElementById('birthday');
    var time = new Date();
    var year = time.getFullYear();
    var items_array = [];

    //フォーカスした際にpickerviewデフォルド選択の値を決める
    var fastvalue = '';
    if (birthday.value.length === 0) {
      fastvalue = String(year);
    }else{
      fastvalue = birthday.value;
    }

    for (var i = year; i >= year-100; i--) {
      var obj = {text: String(i), value: String(i)};
      items_array.push(obj);
    }

    var config = {
      title: '', 
      items: items_array,

      selectedValue: fastvalue,
      doneButtonLabel: 'Done',
      cancelButtonLabel: 'Cancel'
    };

    window.plugins.listpicker.showPicker(config, function(item) { 
      birthday.value = item;
      index.formcheck[1] = true;
      index.change_abled_signup_button();
    },
    function() { 
      console.log("You have cancelled");
    });
  },

  /**
   * 性別を選択するチェックボックスの状態から性別の識別子を返す
   * @return {[string]} [M or F]
   */
  get_sex: function(){
    var M = document.getElementById('radio_m').checked;
    if (M === true) {
      return 'M';
    }else{
      return 'F';
    }
  },
};


/**
* movieで使用する関数をまとめたオブジェクト
* @type {Object}
*/
var movie = {
  /**
   * 自動ログイン後に映画一覧画面の表示を行う
   */
  draw_movie_content: function() {
    //自動ログイン
    var ncmb = utility.get_ncmb();
    var storage = window.localStorage;
    var username = storage.getItem('username');
    var password = storage.getItem('password');
    var signup_flag = storage.getItem('signup_flag');

    //ユーザ情報が存在する場合はローディング画面を表示する
    var callback = function(){
      if (signup_flag == 'true') {
        document.getElementById('index').innerHTML = '<img  src="img/splash.gif" alt="" / width="100%" height="100%">';
      }
    };
    utility.check_page_init('index',callback);
    

    ncmb.User.login(username, password).then(function(data){
      // ログイン後に映画情報をデータベースから取得
      var query = 'SELECT tmdb_id FROM movie';
      return db_method.single_statement_execute(query,[]);
    })
    .then(function(movie_result) {
      var movie_count = movie_result.rows.length;
      var draw_content = function(){};

      //ローカルに保存されている映画情報の件数で表示内容を変える
      if (movie_count === 0) {
        draw_content = function(){
          var nodata_message_p = $('<p>');
          nodata_message_p.addClass('center_message');
          nodata_message_p.html('登録された映画はありません');
          $('#nodata_message').append(nodata_message_p);
        };
      }else {
        draw_content = function(){
          return new Promise(function(resolve,reject) {
            var result = [];
            var db = utility.get_database();
            db.readTransaction(function(tx) {
              tx.executeSql('SELECT title,genre_id,onomatopoeia_id,tmdb_id,poster,dvd,fav FROM movie', [], function(tx, resultSet) {
                result.push(resultSet);

                tx.executeSql('SELECT id,name FROM genre', [], function(tx, resultSet) {
                  result.push(resultSet);

                  tx.executeSql('SELECT id,name FROM onomatopoeia', [], function(tx, resultSet) {
                    result.push(resultSet);
                  },
                  function(tx, error) {
                    console.log('SELECT error: ' + error.message);
                    reject(error.message);
                  });
                });
              });
            },
            function(error) {
              console.log('transaction error: ' + error.message);
              reject(error.message);
            },
            function() {
              resolve(result);
            });
          })
          .then(function(result) {
            //result[0]：movie
            //result[1]：genre
            //result[2]：onomatopoeia

             var movie_collection_list = document.getElementById('movie_collection_list');
             movie_count = result[0].rows.length;

            //[0]:灰色、[1]:オレンジ色、[2]:朱色
            var color_code =utility.get_color_code('movies');

            var lists_html = '';
            for(var i = 0; i < movie_count; i++) {
              var movie_record = result[0].rows.item(i);
              var buttoncolor_code = {dvd:'', fav:''};

              if (movie_record.dvd == 1) {
                buttoncolor_code.dvd = color_code[1];
              }else {
                buttoncolor_code.dvd = color_code[0];
              }

              if (movie_record.fav == 1) {
                buttoncolor_code.fav = color_code[2];
              }else {
                buttoncolor_code.fav = color_code[0];
              }     

              var list = '<ons-list-item modifier="longdivider">'+
                         '<div class="left">'+
                         '<img class="list_img" src="' + movie_record.poster + '">'+
                         '</div>'+
                         '<div class="center">'+
                         '<span class="list-item__title list_title">'+
                         movie_record.title+
                         '</span>'+
                         '<span class="list-item__subtitle list_sub_title">'+
                         'ドキドキ、ハラハラ、モヤモヤ'+
                         '</span>'+
                         '<span class="list-item__subtitle">'+
                         '追加日:2015-05-30'+
                         '</span>'+
                         '</div>'+
                         '</ons-list-item>';

              lists_html += list;
            }

            movie_collection_list.innerHTML = '<ons-list>' + 
                                              '<ons-list-header>全て</ons-list-header>' + 
                                              lists_html + 
                                              '</ons-list>';
          });
        };
      }

      utility.check_page_init('movies',draw_content);
    })
    .then(function() {
      utility.pushpage('tab.html','fade',0);
    })
    .catch(function(err) {
      //ログインエラー or レコード件数取得エラー
      console.log(err);
    });
  },


  /**
   * moviesのDVDやFAVボタンを押した際にデータベースの値を更新する関数
   * @param  {[string]} id [dvdorfav + タップした映画のtmdb_id]
   * @param  {[number]} flag    [0:DVD, 1:FAV]
   */
  tap_dvd_fav: function(id,flag) {
    var tmdb_id = Number(id.substring(id.indexOf('_')+1,id.length));

    /*** タップしたボタンに該当する項目の更新をする ***/
    var query = 'SELECT dvd,fav FROM movie WHERE tmdb_id = ?';
    db_method.single_statement_execute(query,[tmdb_id]).then(function(result) {
      var query_obj = {query:'', data:[]};

      if (flag === 0) {
        query_obj.query = 'UPDATE movie SET dvd = ? WHERE tmdb_id = ?';

        if (result.rows.item(0).dvd === 0) {
          query_obj.data = [1,tmdb_id];
        }else {
          query_obj.data = [0,tmdb_id];
        }
      }else {
        query_obj.query = 'UPDATE movie SET fav = ? WHERE tmdb_id = ?';

        if (result.rows.item(0).fav === 0) {
          query_obj.data = [1,tmdb_id];
        }else {
          query_obj.data = [0,tmdb_id];
        }
      }

    return db_method.single_statement_execute(query_obj.query,query_obj.data);
    }).then(function(result) {
      /*** 更新後にボタンの色を変更する ***/

      var lead_id = '';
      var color_code = '';
      var movies_color_code = utility.get_color_code('movies');

      if (flag === 0) {
        lead_id = 'dvd';
        color_code = movies_color_code[1];
      }else {
        lead_id = 'fav';
        color_code = movies_color_code[2];
      }

      //タップしたボタンの色を取得してhexへ変換
      var current_color_rgb = document.getElementById(lead_id+'_'+tmdb_id).style.color;
      var color = new RGBColor(current_color_rgb);
      var current_color_hex = color.toHex();

      //ボタン色が灰色の場合は色を付ける、色がついている場合は灰色にする
      if (current_color_hex == movies_color_code[0]) {
        document.getElementById(lead_id+'_'+tmdb_id).style.color = color_code;
      }else {
        document.getElementById(lead_id+'_'+tmdb_id).style.color = movies_color_code[0];
      }
    })
    .catch(function(err) {
      console.log(err);
      utility.show_error_alert('更新エラー','更新時にエラーが発生しました','OK');
    });
  },
};


var movieadd_search = {
  /**
   * Searchボタン(改行)を押した際に動作
   */
  click_done: function(){
    //console.log('click_done');
    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

    document.getElementById('search_movie_title').blur();        
  },


  /**
   * バツボタンをタップした際に動作
   */
  tap_reset: function(){
    //formのテキストを初期化、バツボタンの削除、検索結果なしメッセージの削除
    document.getElementById('search_movie_title').value = '';
    document.getElementById('movieadd_search_reset').innerHTML = '';
    document.getElementById('movieadd_no_match_message').innerHTML = '';
    movieadd_search.not_show_list();

    //テキスト未確定入力時にリセットボタンを押した時
   if ($(':focus').attr('id') == 'search_movie_title') {
    document.getElementById('search_movie_title').blur();
    document.getElementById('search_movie_title').focus();

    //テキスト入力確定後にリセットボタンを押した時
   }else {
    document.getElementById('search_movie_title').focus();
   }
  },


  /**
   * movieadd_searchのsearch-input横にあるキャンセルボタンをタップ(バックボタンも)した際に前のページへ画面遷移する
   */
  tap_cancel: function(){
    document.getElementById('myNavigator').popPage({refresh:true});
    //console.log("tap_cancel");
  },


  /**
   * 検索フォームにフォーカス時、フォーカスが外れた時のアニメーションを設定する
   * @param {[string]} event_name [focusまたはblurを受け取る]
   */
  set_animation_movieadd_search_input: function(event_name) {

    //検索フィールドにフォーカスした時のアニメーション
    if (event_name == 'focus') {
      //console.log("focus");

      //検索窓の入力を監視するイベントを追加する
      $('#search_movie_title').on('input', movieadd_search.get_search_movie_title_val);

      $('#movieadd_search_backbutton').animate({opacity: 0},{queue: false, duration: 200}).animate({marginLeft: '-40px'}, {queue: false, duration: 200});

      $('#search_movie_title').animate({width: '150%'},{queue: false, duration: 200});

      $('#movieadd_search_cancel_button').html('キャンセル');
      $('#movieadd_search_cancel_button').animate({marginLeft: '45px'},{queue: false, duration: 200}).animate({opacity: 1},{queue: false, duration: 200});

      $('#movieadd_reset_button').animate({margin: '0px 0px 0px -100px'},{queue: false, duration: 200});

    //検索フィールドのフォーカスが外れた時のアニメーション
    } else if (event_name == 'blur') {
      //console.log("blur");
      movieadd_search.get_search_movie_title_val();

      //検索窓の入力を監視するイベントを削除する
      $('#search_movie_title').off('input', movieadd_search.get_search_movie_title_val);

      $('#movieadd_search_backbutton').animate({marginLeft: '0px'},{queue: false , duration: 200}).animate({opacity: 1},{queue: false , duration: 200});

      $('#search_movie_title').animate({width: '170%'},{queue: false, duration: 200});

      $('#movieadd_search_cancel_button').animate({marginLeft: '500px'},{queue: false, duration: 200}).animate({opacity: 0},{queue: false , duration: 200});

      $('#movieadd_reset_button').animate({margin: '0px 0px 0px -60px'},{queue: false, duration: 200});
    }
  },

  show_list_data: [],     //listに表示中のデータを格納する


  /**
   * 検索窓にテキストを入力するたびに入力したテキストを取得する
   * 検索窓の文字数が1以上ならリセットボタンを表示させる
   */
  get_search_movie_title_val: function(){
    var text = document.getElementById('search_movie_title').value;
    var resetbutton = document.getElementById('movieadd_search_reset');
    var no_match_message = document.getElementById('movieadd_no_match_message');

    if (text.length > 0) {
      //テキストエリアのリセットボタン表示、スピナー表示
      resetbutton.innerHTML = '<ons-button id="movieadd_reset_button" onclick="movieadd_search.tap_reset()" style="margin: 0px 0px 0px -100px;" modifier="quiet"><ons-icon icon="ion-close-circled"></ons-icon></ons-button>';
      utility.show_spinner('movieadd_no_match_message');

      //日本語と英語のリクエスト、ローカルDBから記録した映画リストの取得を行う
      var query = 'SELECT tmdb_id, dvd FROM movie';
      var promises = [movieadd_search.create_request_movie_search(text,'ja'),movieadd_search.create_request_movie_search(text,'en'), db_method.single_statement_execute(query,[])];

      Promise.all(promises).then(function(results) {
        //idだけの配列を作成
        var local_tmdb_id = [];
        var local_dvd = [];
        for(var i = 0; i < results[2].rows.length; i++) {
            local_tmdb_id.push(results[2].rows.item(i).tmdb_id);
            local_dvd.push(results[2].rows.item(i).dvd);
        }

        utility.stop_spinner();

        //検索結果として表示するデータを生成する
        var list_data = movieadd_search.create_list_data(results[0],results[1]);
        movieadd_search.show_list_data = list_data;

        //データによって表示するコンテンツを動的に変える
        if (list_data.length === 0) {
          no_match_message.innerHTML = '検索結果なし';
          
          $('#movieadd_no_match_message').css('height', '100%');
          movieadd_search.not_show_list();
        }else{
          no_match_message.innerHTML = '';

          $('#movieadd_no_match_message').css('height', '0%');
                               
          var list_data_poster = movieadd_search.get_poster(list_data);

          //サムネイル取得後にリストを表示する
          var movieadd_SearchList = document.getElementById('movieadd_search_list');
          var list_doc = [];

          for(i = 0; i < list_data.length; i++) {
            var movie_releasedate = '公開日：';
            var exist_message = [];
            var exist_flag = '';

            /*ローカルに保存済みの映画は
            ・IDにexistを追記
            ・チェックマークと追加済みのメッセージを表示
            */
            var index = local_tmdb_id.indexOf(list_data[i].id);
            if (index == -1) {
              exist_message = [''];
              exist_flag = '';
            }else {
              exist_message = ['<div class="exist_message">',
                               '<ons-icon icon="ion-ios-checkmark-outline"></ons-icon>',
                               '</div>'];
              exist_flag = 'exist';
            }

            //TMDBから取得したrelease_dateが空だった場合は情報なしを代入する
            var date = list_data[i].release_date;
            if (date.length === 0) {
              movie_releasedate += '情報なし';
            }else {
              movie_releasedate += list_data[i].release_date;
            }

            var list_item_doc = ['<ons-list-item id="'+ i +'" name="' + exist_flag + '" modifier="longdivider chevron" tappable="true" onclick="movieadd_search.tap_list(this)">',
                                 '<div class="left">',
                                 '<img id="'+ i +'_img" style="box-shadow: 0px 2px 4px 0px rgba(0,0,0,0.5); width: 80px; height: 120px; background:url(img/loading.gif) no-repeat center;" class="list__item__thumbnail" src="'+ list_data_poster[i] +'">',
                                 '</div>',
                                 '<div class="center">',
                                 '<span class="list__item__title" style="font-weight: 700;">'+ list_data[i].title +'</span>',
                                 '<span id="overview_'+i +'" class="list__item__subtitle">'+ list_data[i].overview +'</span>',
                                 '<span class="list__item__subtitle">'+ movie_releasedate +'</span>',
                                 '</div>',
                                 exist_message.join(''),
                                 '</ons-list-item>'];
            list_doc.push(list_item_doc.join(''));
          }

          movieadd_SearchList.innerHTML = list_doc.join('');

          //overviewが長すぎて範囲内に収まらない場合に文字列をカットする処理
          for(i = 0; i < list_data.length; i++) {
            var flag = false;
            var span = document.getElementById('overview_'+i);
            var span_height = span.offsetHeight;
            var copy_overview = list_data[i].overview;

            while(span_height > 80 && copy_overview.length > 0) {
              flag = true;
              copy_overview = copy_overview.substr(0, copy_overview.length-5);
              document.getElementById('overview_'+i).innerHTML = copy_overview;
              span_height = document.getElementById('overview_'+i).offsetHeight;
            }

            if (flag) {
              document.getElementById('overview_'+i).innerHTML += '…';
            }
          }
        }

      }, function(reason) {
        console.log(reason);
      });

    } else {
      resetbutton.innerHTML = '';
      no_match_message.innerHTML = '';
      movieadd_search.not_show_list();
    }
  },

  
  /**
   * 映画をタイトルで検索するリクエストを生成して実行する
   * @param  {[string]} movie_title [検索したい映画タイトル]
   * @param  {[string]} language    [jaで日本語情報、enで英語情報]
   * @return {[json]}             [検索結果をjsonに変換したもの]
   */
  create_request_movie_search: function(movie_title, language){
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      var api_key = utility.get_tmdb_apikey();
      var request_url = 'http://api.themoviedb.org/3/search/movie?query=' +movie_title +'&api_key=' + api_key + '&language=' +language;

      request.open('GET', request_url);

      request.setRequestHeader('Accept', 'application/json');

      request.onreadystatechange = function () {
        if (this.readyState === 4) {
          var contact = JSON.parse(this.responseText);
          resolve(contact);
        }
      };

      request.send();
    });
  },

  /**
   * jaとenの検索結果を1つの配列にまとめる
   * @param  {[array]} ja_results_json [jaリクエストの配列
   * @param  {[array]} en_results_json [enリクエストの配列]
   * @return {[array]}       [jaとen検索結果をまとめた配列]
   */
  create_list_data: function(ja_results_json,en_results_json){
    if (ja_results_json.length === 0 && en_results_json.length === 0) {
      return [];
    }else{
      var list_data = [];                     //overviewが空文字でないオブジェクトを格納する
      var overview_nodata = [];               //overviewが空文字のオブジェクトのidプロパティを格納する

      var ja_results = ja_results_json.results;
      var en_results = en_results_json.results;

      /*ja_resutlsの中でoverviewが空文字でないオブジェクトをlist_dataに格納する
      overviewが空文字のオブジェクトidをoverview_nodataに格納する*/
      for(var i = 0; i < ja_results.length; i++){
        var ja_overview_text = ja_results[i].overview;
        if (ja_overview_text.length !== 0) {
          list_data.push(ja_results[i]);
        }else{
          overview_nodata.push(ja_results[i].id);
        }
      }

      //en_resultsの中からoverview_nodataに格納されているidと一致したオブジェクトをlist_dataに格納する
      for(var j = 0; j < overview_nodata.length; j++){
        for(var k = 0; k < en_results.length; k++){
          var nodata_id = overview_nodata[j];
          var en_id = en_results[k].id;

          if (nodata_id == en_id) {
            list_data.push(en_results[k]);
          }
        }
      }

      return list_data;
    }
  },

  /**
   * サムネイルとして表示する画像を取得する
   * @param  {[array]} list_data [映画オブジェクトの配列]
   * @return {[string]}           [画像のパス]
   */
  get_poster: function(list_data){
    var image_url_array = [];

    //画像を配列に格納する
    for(var i = 0; i < list_data.length; i++){
      var poster_path = list_data[i].poster_path;
      var url = '';

      if (poster_path !== null) {
        url = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2' + poster_path;
        image_url_array.push(url);
      }else{
        url = 'img/noimage.png';
        image_url_array.push(url);
      }
    }
    return image_url_array;
  },

  /**
   * リストのコンテンツを非表示にする
   */
  not_show_list: function(){
    var infiniteList = document.getElementById('movieadd_search_list');
    infiniteList.delegate = {
      createItemContent: function(i) {
        return ons._util.createElement();
      },
                                      
      countItems: function() {
        return 0;
      },

      calculateItemHeight: function() {
        return ons.platform.isAndroid() ? 48 : 100;
      }
    };
  },


  /**
   * リストをタップした際に動作する
   * @param  {[object]} obj [タップしたオブジェクト]
   */
  tap_list: function(obj){
    //キャンセルボタンが移動しきれない場合があるため強制的に移動させる
    document.getElementById('movieadd_search_cancel_button').style.marginLeft = '500px';
    
    var list_data = movieadd_search.show_list_data;
    var tap_id = obj.id;
    var myNavigator = document.getElementById('myNavigator');

    //movieaddの画面初期化後に動作する関数を定義
    var callback = function(){
      movieadd.show_contents(list_data,tap_id);
    };
    utility.check_page_init('movieadd',callback);

    movieadd.current_movie = list_data[tap_id];

    //映画追加画面へ遷移
    myNavigator.pushPage('movieadd.html', {});
  },
};



var movieadd = {
  userdata: {feeling_name_list: [], dvd: false},
  current_movie: {},

  taped: false,       //falseなら映画の情報が表示されていない、trueは表示済み(表示中)

  /**
   * [映画追加画面のコンテンツを表示する]
   * @param  {[array]} list_data [検索結果の映画オブジェクトが格納された配列]
   * @param  {[number]} tap_id    [映画検索画面のリストのうちタップされたリスト番号]
   */
  show_contents: function(list_data,tap_id){

    //映画のユーザデータを初期化する
    movieadd.userdata.feeling_name_list = [];
    movieadd.userdata.dvd = false;

    //card部分に表示する画像を取得して表示
    var card = document.getElementById('movieadd_card');
    var tap_list_obj = document.getElementById(tap_id+'_img');
    var img_url = tap_list_obj.getAttribute('src');

    $('#movieadd_card').css('backgroundImage' ,'url('+img_url+')');

    //noimageとサムネイルでサイズ設定を変える
    if (img_url.indexOf('noimage.png') != -1) {
      $('#movieadd_card').css('backgroundSize' ,'contain');
    }else {
      $('#movieadd_card').css('backgroundSize' ,'cover');
    }

    //card部分や吹き出しタップ時に表示する情報の取得と追加
    var title = list_data[tap_id].title;
    var overview = list_data[tap_id].overview;
    var release_date = list_data[tap_id].release_date;
    card.innerHTML = '<div class="modal" id="movie_detail_info" style="z-index: 0; height: 87%; opacity: 0.0;"><div class="modal__content"><p>'+ title +'</p><p>'+ overview +'</p><p>'+ release_date +'</p></div></div>';

    movieadd.show_vote_average(list_data[tap_id].vote_average);

    //overviewが長すぎて範囲内に収まらない場合に文字列をカットする処理を開始
    var flag = false;
    var copy_overview = overview;
    var info = document.getElementById('movie_detail_info');
    var info_clone = info.cloneNode(true);
    info_clone.innerHTML = '<div class="modal__content"><p>'+ title +'</p><p>'+ copy_overview +'</p><p>'+ release_date +'</p></div></div>';
    card.appendChild(info_clone);

    var rating = document.getElementById('movieadd_rating');
    var toolbar = document.getElementById('movieadd_toolbar');

    //高さがポスター表示領域の高さ付近になるまで文字列をカットする
    while((copy_overview.length > 0) && (info_clone.clientHeight > card.clientHeight)) {
      flag = true;

      copy_overview = copy_overview.substr(0, copy_overview.length-80);

      info_clone.innerHTML = '<div class="modal__content"><p>'+ title +'</p><p>'+ copy_overview +'</p><p>'+ release_date +'</p></div></div>';
    }

    //文字列カットの処理を実行していたら3点リーダを追加
    if (flag) {
      copy_overview = copy_overview + '...';
    }

    //カット後の文字列でhtmlを上書きする
    card.innerHTML = '<div class="modal" id="movie_detail_info" style="position: fixed; z-index: 0; height: 87%; opacity: 0.0;"><div class="modal__content"><p>'+ title +'</p><p>'+ copy_overview +'</p><p>'+ release_date +'</p></div></div>';
  },

  /**
   * 映画追加画面上部のツールバーにあるバックボタンをタップした際にpopPageを行う
   */
  tap_backbutton: function(){
    document.getElementById('myNavigator').popPage();
  },


  /**
   * card部分や吹き出しタップ時にアニメーション表示を行う
   */
  fadeTo_detail_info: function(){
    if (movieadd.taped === false) {
      $('#movie_detail_info').fadeTo(300,1);
      movieadd.taped = true;
    }else {
      $('#movie_detail_info').fadeTo(300,0);
      movieadd.taped = false;
    }  
  },


  /**
   * 映画のレーティングを最大評価5に合うように計算して表示する
   * @param  {[number]} vote_average [最大評価10.0の評価値]
   */
  show_vote_average: function(vote_average){
    //検索結果のvote_averageはMAX10なので半分にする
    var ave = vote_average / 2.0;

    //小数点第2位で四捨五入をする
    var pow = Math.pow(10,1);
    ave = Math.round(ave*pow) / pow;

    //整数部分に0.5を足してx.5という形にする
    var pivot = Math.floor(ave) + 0.5;

    //x.5より大きいか小さいかで(x.5〜x.5+0.5)か(x.0〜x.5)の上限と下限を決定する
    var under_limit = 0.0;
    var over_limit = 0.0;
    
    if (ave < pivot) {
      under_limit = pivot - 0.5;
      over_limit = pivot;
    }else {
      under_limit = pivot;
      over_limit = pivot + 0.5;
    }

    //上限と下限に近い方の値をvote_averageとする
    var result = 0.0;
    if (Math.abs(ave-under_limit) < Math.abs(ave-over_limit)) {
      result = under_limit;
    }else {
      result = over_limit;
    }

    //整数部と少数部を取得
    var integer = Math.floor(result);
    var few = String(result).split(".")[1];

    //星と数値を書き込む
    var rating_num = document.getElementById('movieadd_rating');
    var innerHTML_string = '';
    var few_write = false;
    for(var i = 0; i < 5; i++){
      if (i < integer) {
        innerHTML_string += '<ons-icon icon="ion-ios-star" fixed-width="false"></ons-icon>';
      }else if (few == 5 && few_write === false) {
        innerHTML_string += '<ons-icon icon="ion-ios-star-half" fixed-width="false"></ons-icon>';
        few_write = true;
      }else{
        innerHTML_string += '<ons-icon icon="ion-ios-star-outline" fixed-width="false"></ons-icon>';
      }
    }

    innerHTML_string += result;

    rating_num.innerHTML = innerHTML_string;
  },

  //映画追加ボタンを押したら動作
  add_movie: function(){
    var userdata = movieadd.userdata;

    if (userdata.feeling_name_list.length === 0) {
      ons.notification.alert(
      {
        title: '映画追加エラー',
        message: '気分リストに気分が追加されていません',
        buttonLabel: 'OK'
      });
    }else {
      //ツールバーとユーザアクション部分のボタンを無効にする
      var button_list = [document.getElementById('movieadd_add_button'),document.getElementById('movieadd_pushfeeling_button'),document.getElementById('movieadd_pushdvd_button'),document.getElementById('movieadd_share_button'),document.getElementById('movieadd_show_info_button'),document.getElementById('movieadd_back_button')];
      utility.setAttribute_list_object(button_list, 'disabled');

      utility.show_spinner('movieadd_card');

      //オノマトペをuserdataから取得
      var user_onomatopoeia_list = movieadd.userdata.feeling_name_list;

      //表示中の映画オブジェクトを取得
      var movie = movieadd.current_movie;

      var promises = [movieadd.genre_ncmb(movie.genre_ids),movieadd.onomatopoeia_ncmb(user_onomatopoeia_list)];

      //ジャンル関係とオノマトペ関係の処理を実行
      var genre_obj_list = [];
      var onomatopoeia_obj_list = [];
      Promise.all(promises).then(function(genre_onomatopoeia_results) {
        genre_obj_list = genre_onomatopoeia_results[0];
        onomatopoeia_obj_list = genre_onomatopoeia_results[1];

        return movieadd.get_ncmb_same_movie(movie.id);
      })
      .then(function(same_movie_results) {
        // console.log(same_movie_results);
        // console.log(genre_obj_list);
        // console.log(onomatopoeia_obj_list);
        // console.log(movie);
          
        //オノマトペオブジェクトリストからIDとcount1を格納した配列を作成
        var onomatopoeia_id_count_list = [];
        for(var i = 0; i < onomatopoeia_obj_list.length; i++) {
            onomatopoeia_id_count_list.push({'id':onomatopoeia_obj_list[i].id, 'count':1});
        }

        //ジャンルオブジェクトリストからIDを取り出した配列を作成
        var genre_id_list = [];
        for(var j = 0; j < genre_obj_list.length; j++) {
            genre_id_list.push(genre_obj_list[j].id);
        }

        //同じ映画がNCMBに追加されていなかったら
        if (same_movie_results.length === 0) {
          return movieadd.set_ncmb_movie(movie.title,movie.id,genre_id_list,onomatopoeia_id_count_list);

        //既に映画がNCMBに追加してあったら
        }else {
          var ncmb = utility.get_ncmb();
          var currentUser = ncmb.User.getCurrentUser();

          var search_result = same_movie_results[0];
          var ncmb_onomatopoeia_list = search_result.Onomatopoeia_ID;

          var username_list = search_result.UserName;
          if (username_list.indexOf(currentUser.userName) == -1) {
            username_list.push(currentUser.userName);
          }

          //MovieのOnomatopoeia_ID内のidのみを取り出したリストを作成する
          var ncmb_onomatopoeia_id_list = [];
          for(i = 0; i < ncmb_onomatopoeia_list.length; i++) {
            ncmb_onomatopoeia_id_list.push(ncmb_onomatopoeia_list[i].id);
          }

          //ユーザが追加したオノマトペオブジェクトリストのidのみを取り出した配列を作成
          var onomatopoeia_id_list = [];
          for(i = 0; i < onomatopoeia_obj_list.length; i++) {
            onomatopoeia_id_list.push(onomatopoeia_obj_list[i].id);
          }

          //ユーザが追加したオノマトペの数だけNCMBから取得したオノマトペリストへの新規追加or更新を行う
          for(i = 0; i < onomatopoeia_id_list.length; i++) {
            var index = ncmb_onomatopoeia_id_list.indexOf(onomatopoeia_id_list[i]);

            if (index == -1) {
              ncmb_onomatopoeia_list.push({'id':onomatopoeia_id_list[i], 'count': 1});
            }else {
              ncmb_onomatopoeia_list[index].count += 1;
            }
          }

          // console.log(ncmb_onomatopoeia_list);
          return movieadd.update_ncmb_movie(search_result.TMDB_ID,ncmb_onomatopoeia_list,username_list);
        }
      })
      .then(function(movie_result) {
        //ローカル保存処理を開始

        //(id integer primary key, title text unique, tmdb_id integer unique, genre_id text, onomatopoeia_id text, poster blob)
        // console.log(movie_result);

        var base_url = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2';
        var image = new Image();
        image.src = base_url + movie.poster_path;
        var image_b64 = '';
        var movie_record_count = 0;

        var promises = [db_method.count_record('movie'),movieadd.set_genre_local(genre_obj_list),movieadd.set_onomatopoeia_local(onomatopoeia_obj_list),utility.image_to_base64(image, 'image/jpeg')];

        Promise.all(promises).then(function(results) {
          image_b64 = results[3];
          movie_record_count = results[0];
          
          //ローカルDBにユーザが追加したオノマトペオブジェクトを問い合わせるpromisesを作成
          var promises = [];
          for(var i = 0; i < user_onomatopoeia_list.length; i++) {
            var query = 'SELECT id FROM onomatopoeia WHERE name = ?';
            var data = [user_onomatopoeia_list[i]];
            promises.push(db_method.single_statement_execute(query,data));
          }

          return promises;
        })
        .then(function(promises) {
          Promise.all(promises).then(function(results) {
            var genre_csv = '';
            var onomatopoeia_csv = '';

            //オノマトペIDのcsvを作成
            for(var i = 0; i < results.length; i++) {
              onomatopoeia_csv += results[i].rows.item(0).id + ',';
            }
            onomatopoeia_csv = onomatopoeia_csv.substr(0, onomatopoeia_csv.length-1);

            //ジャンルIDのcsvを作成
            for(i = 0; i < movie_result.Genre_ID.length; i++) {
              genre_csv += movie_result.Genre_ID[i] + ',';
            }
            genre_csv = genre_csv.substr(0, genre_csv.length-1);

            //dvd所持情報を作成
            var dvd = 0;
            if (movieadd.userdata.dvd === true) {
              dvd = 1;
            }else {
              dvd = 0;
            }

            var query = 'INSERT INTO movie(id,title,tmdb_id,genre_id,onomatopoeia_id,poster,dvd,fav) VALUES(?,?,?,?,?,?,?,?)';
            var data = [movie_record_count,movie_result.Title, movie_result.TMDB_ID, genre_csv, onomatopoeia_csv, image_b64, dvd, 0];

            return db_method.single_statement_execute(query, data);
          })
          .then(function(result) {
            console.log(result);
            utility.stop_spinner();
            document.getElementById('success_movieadd_alert').show();
          })
          .catch(function(err) {
            console.log(err);
            utility.stop_spinner();
            utility.show_error_alert('映画追加エラー','映画追加時にエラーが発生しました','OK');
            utility.removeAttribute_list_object(button_list, 'disabled');
          });
        })
        .catch(function(err) {
          console.log(err);
          utility.stop_spinner();
          utility.show_error_alert('映画追加前処理エラー','映画追加の前処理でエラーが発生しました','OK');
          utility.removeAttribute_list_object(button_list, 'disabled');
        });
      })
      .catch(function(err){
        console.log(err);

        utility.stop_spinner();
        utility.removeAttribute_list_object(button_list, 'disabled');
        
        switch(err) {
          case 'NCMB_Get_Genre_Error':
            utility.show_error_alert('ジャンル取得エラー','サーバからのジャンル取得に失敗しました','OK');
            break;

          case 'NCMB_Get_Onomatopoeia_Error':
            utility.show_error_alert('気分取得エラー','サーバからの気分の取得に失敗しました','OK');
            break;

          case 'NCMB_Set_Genre_Error':
            utility.show_error_alert('ジャンル登録エラー','サーバへのジャンル登録に失敗しました','OK');
            break;

          case 'NCMB_Set_Onomatopoeia_Error':
            utility.show_error_alert('気分登録エラー','サーバへの気分登録に失敗しました','OK');
            break;

          default:
            utility.show_tmdb_error(err);
            break;
        }
      });
    }
  },

  /**
   * ジャンル関係の処理を行う
   * @param  {[array]} genre_id_list [ユーザが追加しようとしている映画に付与済みのジャンルIDArray]
   * @return {[promise]} [成功時：LocalDBに記録するジャンルオブジェクト配列
                          失敗時：エラーステータス]
   */
  genre_ncmb: function(genre_id_list){
    return new Promise(function(resolve,reject) {
      var genre_id_list_bridge = {};  //ジャンルIDをまたいで使用するために格納する
      var genre_obj_list = [];        //LocalDBに記録する用のジャンルオブジェクト

      //NCMBからジャンルリストを取得
      movieadd.get_ncmb_genres().then(function(ncmb_genre_list) {
        //映画オブジェクトのジャンルIDがNCMBに存在していたら削除する
        for(var i = genre_id_list.length - 1; i >= 0; i--) {
          for(var j = 0; j < ncmb_genre_list.length; j++) {
            if (genre_id_list[i] == ncmb_genre_list[j].ID) {
              genre_id_list.splice(i,1);
              genre_obj_list.push({id:ncmb_genre_list[j].ID, name: ncmb_genre_list[j].Name});
            }
          }
        }
        /*テストコード*/
        // genre_id_list.push(99999);
        // genre_id_list.push(12345);
        // genre_id_list.push(88888);
        // genre_id_list.push(77777);

        return genre_id_list;
      })
      .then(function(genre_id_list){
        //NCMBに登録されていないジャンルIDが存在する場合
        if (genre_id_list.length !== 0) {
          genre_id_list_bridge = genre_id_list;
          return movieadd.get_tmdb_genre_list();
        }else {
          return {genres: []};
        }
      })
      .then(function(tmdb_genre_obj){
        var tmdb_genre_list = tmdb_genre_obj.genres;

        //idだけの配列を作成
        var tmdb_genre_id_list = [];
        for(var i = 0; i < tmdb_genre_list.length; i++) {
          tmdb_genre_id_list.push(tmdb_genre_list[i].id);
        }

        /*テストコード*/
        // tmdb_genre_id_list.push(99999);
        // tmdb_genre_id_list.push(88888);
        // tmdb_genre_id_list.push(77777);

        // var test_obj1 = {};
        // test_obj1.id = 99999;
        // test_obj1.name = 'hoge1';
        // tmdb_genre_list.push(test_obj1);

        // var test_obj2 = {};
        // test_obj2.id = 88888;
        // test_obj2.name = 'hoge2';
        // tmdb_genre_list.push(test_obj2);

        // var test_obj5 = {};
        // test_obj5.id = 12345;
        // test_obj5.name = 'test_obj5';
        // tmdb_genre_list.push(test_obj5);

        // var test_obj3 = {};
        // test_obj3.id = 77777;
        // test_obj3.name = 'hoge3';
        // tmdb_genre_list.push(test_obj3);

        //tmdbジャンルリスト内にあったらidと名前をncmbへ新規追加する
        var promises = [];
        for(var j = 0; j < genre_id_list_bridge.length; j++) {
          var tmdb_index = tmdb_genre_id_list.indexOf(genre_id_list_bridge[j]);

          if (tmdb_index != -1) {
            var id = tmdb_genre_list[tmdb_index].id;
            var name = tmdb_genre_list[tmdb_index].name;

            genre_obj_list.push({id:id, name: name});
                                    
            promises.push(movieadd.set_genre_ncmb(id,name));
          }
        }

        return promises;
      })
      .then(function(promises){
        Promise.all(promises).then(function(results){
          resolve(genre_obj_list);
        })
        .catch(function(err){
          console.log(err);
          reject(err);
        });
      })
      .catch(function(err){
        console.log(err);
        reject(err);
      });
    });
  },


  /**
   * オノマトペ関係の処理を行う
   * @param  {[array]} onomatopoeia_list [ユーザ追加したオノマトペを格納した配列]
   * @return {[promise]} [成功時：LocalDBに記録するオノマトペオブジェクト配列
                          失敗時：エラーステータス]
   */
  onomatopoeia_ncmb: function(onomatopoeia_list) {
    return new Promise(function(resolve,reject) {
      var onomatopoeia_obj_list = [];

      //クラウドからオノマトペリストを取得
      movieadd.get_ncmb_onomatopoeia().then(function(ncmb_onomatopoeia_list) {
        //オノマトペ名だけの配列を作成
        var onomatopoeia_name_list = [];
        for(var i = 0; i < ncmb_onomatopoeia_list.length; i++) {
          onomatopoeia_name_list.push(ncmb_onomatopoeia_list[i].Name);
        }

        var promises = [];
        var id_count = ncmb_onomatopoeia_list.length;
        for(var j = 0; j < onomatopoeia_list.length; j++) {
          var index = onomatopoeia_name_list.indexOf(onomatopoeia_list[j]);

          //NCMBのオノマトペリスト内になかったらNCMBへ新規追加
          if (index == -1) {
            var new_id = id_count;
            var new_name = onomatopoeia_list[j];

            onomatopoeia_obj_list.push({id:new_id, name:new_name});
            promises.push(movieadd.set_onomatopoeia_ncmb(new_id,new_name));

            id_count += 1;

          //存在したらNCMBからIDと名前を取得
          }else {
            var old_id = ncmb_onomatopoeia_list[index].ID;
            var old_name = ncmb_onomatopoeia_list[index].Name;

            onomatopoeia_obj_list.push({id:old_id,name:old_name});
          }
        }

        return promises;
      })
      .then(function(promises) {
        Promise.all(promises).then(function(results) {
          resolve(onomatopoeia_obj_list);
        })
        .catch(function(err){
          console.log(err);
          reject(err);
        });
      })
      .catch(function(err){
        console.log(err);
        reject(err);
      });
    });
  },


  /**
   * 指定したmovie_idを持つレコードを検索して結果を返す
   * @param  {[number]} movie_id [映画オブジェクトのid]
   * @return {[array]}          [検索結果]
   */
  get_ncmb_same_movie: function(movie_id) {
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Movie = ncmb.DataStore('Movie');
      Movie.equalTo('TMDB_ID', movie_id)
      .fetchAll()
      .then(function(results){
        resolve(results);
      }).catch(function(err){
        reject('Error');
      });
    });
  },

  /**
   * 対象となるMovieレコードのオノマトペリストとユーザリストを変更する
   * @param {[number]} movie_id          [更新するレコードを特定するためのTMDB_ID]
   * @param {[array]} onomatopoeia_list [更新後のオノマトペオブジェクトが格納されたArray]
   * @param {[array]} username_list     [更新後のユーザ名が格納されたArray]
   */
  update_ncmb_movie: function(movie_id, onomatopoeia_list, username_list) {
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Movie = ncmb.DataStore('Movie');
      Movie.equalTo('TMDB_ID', movie_id)
      .fetchAll()
      .then(function(search_result){
        search_result[0].set('Onomatopoeia_ID',onomatopoeia_list);
        search_result[0].set('UserName',username_list);
        return search_result[0].update();
      })
      .then(function(update_result){
        resolve(update_result);
      })
      .catch(function(err){
        reject('Error');
      });
    });
  },

  /**
   * Movieデータクラスにレコードを新規追加する
   * @param {[string]} title                      [映画のタイトル]
   * @param {[number]} tmdb_id                    [映画に付与されているTMDBのID]
   * @param {[array]} genre_id_list              [映画に付与されているジャンルIDの配列]
   * @param {[array]} onomatopoeia_id_count_list [オノマトペのIDとcountを格納したオブジェクト配列]
   */
  set_ncmb_movie: function(title,tmdb_id,genre_id_list,onomatopoeia_id_count_list) {
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var currentUser = ncmb.User.getCurrentUser();

      var Movie = ncmb.DataStore('Movie');
      var movie_datastore = new Movie();

      movie_datastore
      .set('Title', title)
      .set('TMDB_ID', tmdb_id)
      .set('Genre_ID', genre_id_list)
      .set('Onomatopoeia_ID',onomatopoeia_id_count_list)
      .set('UserName',[currentUser.userName])
      .save()
      .then(function(movie_datastore){
        resolve(movie_datastore);
      })
     .catch(function(err){
       console.log(err);
       reject(err);
     });
    });
  },


  /**
   * NCMBのGenreデータクラス全体を取得する
   * @return {[object]} [Genreレコードオブジェクトが格納された1次元配列]
   */
  get_ncmb_genres: function(){
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Genre = ncmb.DataStore('Genre');
      Genre.fetchAll().then(function(results){
        resolve(results);
      }).catch(function(err){
        reject('NCMB_Get_Genre_Error');
      });
    });
  },

  /**
   * NCMBのOnomatopoeiaデータクラス全体を取得する
   * @return {[object]} [Onomatopoeiaレコードオブジェクトが格納された1次元配列]
   */
  get_ncmb_onomatopoeia: function(){
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Onomatopoeia = ncmb.DataStore('Onomatopoeia');
      Onomatopoeia.fetchAll().then(function(results){
        resolve(results);
      }).catch(function(err){
        reject('NCMB_Get_Onomatopoeia_Error');
      });
    });
  },

  /**
   * TMDBのジャンルリストを取得する
   * @return {[array]} [idとnameが格納されたオブジェクトArray]
   */
  get_tmdb_genre_list: function(){
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      var api_key = utility.get_tmdb_apikey();

      var request_url = 'http://api.themoviedb.org/3/genre/movie/list?api_key=' + api_key + '&language=ja';

      request.open('GET', request_url);

      request.setRequestHeader('Accept', 'application/json');

      request.onreadystatechange = function () {
        if (this.readyState === 4) {
          if (this.status === 0) {
            reject(0);
          }else {
            if (this.status === 200) {
              var contact = JSON.parse(this.responseText);
              resolve(contact);
            }else {
              reject(this.status);
            }
          }
        }
      };

      request.send();
    });
  },

  /**
   * NCMBのGenreデータクラスへ指定されたidとnameを新規追加する
   * @param {[number]} id   [ジャンルを識別するid(TMDBと同一)]
   * @param {[string]} name [日本語で表記されたジャンル名]
   */
  set_genre_ncmb: function(id,name) {
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Genre = ncmb.DataStore('Genre');
      var genre = new Genre();
      genre.set('ID', id)
           .set('Name', name)
           .save()
           .then(function(){
             resolve('OK');
           })
           .catch(function(err){
             reject('NCMB_Set_Genre_Error');
           });
    });
  },


  /**
   * ローカルDBのgenreテーブルに引数で渡されたgenreオブジェクトリストを格納する
   * @param {[array]} genre_obj_list [ユーザが追加した映画に付与されているジャンルIDにジャンル名をつけたオブジェクト配列]
   */
  set_genre_local: function(genre_obj_list) {
    return new Promise(function(resolve,reject) {
      //テストコード
      // genre_obj_list.push({'id': 666, 'name': 'hoge4'});
      // genre_obj_list.push({'id': 555, 'name': 'hoge5'});
      // genre_obj_list.push({'id': 444, 'name': 'hoge6'});

      //ローカルからジャンルリストを取得
      db_method.single_statement_execute('SELECT id FROM genre',[]).then(function(results) {
        //ジャンルID(ユーザ登録)だけの配列を作成
        var genre_id_list = [];
        for(var i = 0; i < genre_obj_list.length; i++ ){
          genre_id_list.push(genre_obj_list[i].id);
        }

        //ジャンルID(ローカル)だけの配列を作成
        var genre_id_list_local = [];
        for(i = 0; i < results.rows.length; i++) {
          genre_id_list_local.push(results.rows.item(i).id);
        }

        //ローカルから取得したリストにジャンルID(ユーザ登録)が含まれていなければpromiseに登録する
        var promises = [];
        for(i = 0; i < genre_id_list.length; i++) {
          if (genre_id_list_local.indexOf(genre_id_list[i]) == -1) {
            var index = genre_id_list.indexOf(genre_id_list[i]);
            var name = genre_obj_list[index].name;

            var query = 'INSERT INTO genre(id,name) VALUES(?,?)';
            var data = [genre_id_list[i], name];
            promises.push(db_method.single_statement_execute(query,data));
          }
        }

        return promises;
      })
      .then(function(promises) {
        Promise.all(promises).then(function(results) {
          resolve(results);
        })
        .catch(function(error) {
          console.log(error);
          reject(error);
        });
      })
      .catch(function(error) {
        console.log(error);
        reject(error);
      });
    });
  },

  /**
   * NCMBのOnomatopoeiaデータクラスへ指定されたidとnameを新規追加する
   * @param {[string]} id   [オノマトペを識別するid]
   * @param {[string]} name [オノマトペ名]
   */
  set_onomatopoeia_ncmb: function(id,name) {
    return new Promise(function(resolve,reject) {
      var ncmb = utility.get_ncmb();
      var Onomatopoeia = ncmb.DataStore('Onomatopoeia');
      var onomatopoeia = new Onomatopoeia();
      onomatopoeia.set('ID', id)
           .set('Name', name)
           .save()
           .then(function(){
             resolve('OK');
           })
           .catch(function(err){
             reject('NCMB_Set_Onomatopoeia_Error');
           });
    });
  },

  /**
   * ローカルDBのonomatopoeiaテーブルに引数で渡されたonomatopoeiaオブジェクトリストを格納する
   * @param {[array]} onomatopoeia_obj_list [ユーザが追加したオノマトペオブジェクトリスト]
   */
  set_onomatopoeia_local: function(onomatopoeia_obj_list) {
    return new Promise(function(resolve,reject) {
        //ローカルからオノマトペリストを取得
        db_method.single_statement_execute('SELECT id FROM onomatopoeia', []).then(function(results) {
          //オノマトペID(ユーザ登録)だけの配列を作成
          var onomatopoeia_id_list = [];
          for(var i = 0; i < onomatopoeia_obj_list.length; i++ ){
            onomatopoeia_id_list.push(onomatopoeia_obj_list[i].id);
          }

          //オノマトペID(ローカル)だけの配列を作成
          var onomatopoeia_id_list_local = [];
          for(i = 0; i < results.rows.length; i++) {
            onomatopoeia_id_list_local.push(results.rows.item(i).id);
          }

          //ローカルから取得したリストにオノマトペID(ユーザ登録)が含まれていなければpromiseに登録する
          var promises = [];
          for(i = 0; i < onomatopoeia_id_list.length; i++) {
            if (onomatopoeia_id_list_local.indexOf(onomatopoeia_id_list[i]) == -1) {
              var index = onomatopoeia_id_list.indexOf(onomatopoeia_id_list[i]);
              var name = onomatopoeia_obj_list[index].name;

              var query = 'INSERT INTO onomatopoeia(id,name) VALUES(?,?)';
              var data = [onomatopoeia_id_list[i], name];
              promises.push(db_method.single_statement_execute(query,data));
            }
          }
          return promises;
        })
        .then(function(promises) {
          Promise.all(promises).then(function(results) {
            resolve(results);
          })
          .catch(function(error) {
            console.log(error);
            reject(error);
          });
        })
        .catch(function(error) {
          console.log(error);
          reject(error);
        });   
    });
  },

  /**
   * 映画の詳細を表示している画面の気分リストをタップした際に画面遷移する
   */
  pushpage_feeling: function(){
    var callback = function(){
      movieadd_feeling.show_contents();
    };

    utility.check_page_init('movieadd_feeling', callback);
    utility.pushpage('movieadd_feeling.html', 'lift', 0);
  },


  /**
   * 映画の詳細を表示している画面のDVDをタップした際に画面遷移する
   */
  pushpage_dvd: function(){
    var callback = function(){
      movieadd_dvd.show_contents();
    };

    utility.check_page_init('movieadd_dvd', callback);
    utility.pushpage('movieadd_dvd.html', 'lift', 0);
  },

  /**
   * 登録されたリストの件数とDVD所持情報をもとにラベルを更新する関数
   */
  show_feelingAnddvd_label: function(){
    var list_length = movieadd.userdata.feeling_name_list.length;
    var dvd_flag = movieadd.userdata.dvd;
    var dvd = 'No';

    if (dvd_flag) {
      dvd = 'Yes';
    }else {
      dvd = 'No';
    }

    var list_number = document.getElementById('list_number');
    var have_dvd = document.getElementById('have_dvd');

    list_number.innerHTML = list_length + '件';
    have_dvd.innerHTML = dvd;
  },


  /**
   * 映画追加が完了した後に表示するアラートのOKボタンをタップして動作
   */
  success_movieadd_alert_hide: function() {
    document.getElementById('success_movieadd_alert').hide().then(function(){
      //追加した結果を反映させるために検索を行う
      movieadd_search.get_search_movie_title_val();
      
      utility.popPage();
    });
  },

  /**
   * Twitter、FaceBook、LINEなどのSNSに投稿する
   */
  sns_share: function() {
    var options = {
      message: movieadd.current_movie.title + ' #FiNote', // not supported on some apps (Facebook, Instagram)
      subject: '', // fi. for email
      files: ['', ''], // an array of filenames either locally or remotely
      url: 'https://www.themoviedb.org/movie/' + movieadd.current_movie.id,
      chooserTitle: 'Pick an app' // Android only, you can override the default share sheet title
    };

    var onSuccess = function(result) {
      if (result.app === 'com.apple.UIKit.activity.PostToTwitter' || result.app === 'jp.naver.line.Share') {
          document.getElementById('success_sns_alert').show();

          //映画追加画面のボタンオブジェクト
          var button_list = [document.getElementById('movieadd_add_button'),document.getElementById('movieadd_pushfeeling_button'),document.getElementById('movieadd_pushdvd_button'),document.getElementById('movieadd_share_button'),document.getElementById('movieadd_show_info_button'),document.getElementById('movieadd_back_button')];

          utility.setAttribute_list_object(button_list, 'disabled');
      }

      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    };

    var onError = function(msg) {
      console.log("Sharing failed with message: " + msg);
    };

    window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);
  },

  /**
   * SNSの投稿が完了した後に表示されるアラートを閉じるボタンが押された時に動作する
   */
  success_sns_alert_hide: function() {
    //映画追加画面のボタンオブジェクト
    var button_list = [document.getElementById('movieadd_add_button'),document.getElementById('movieadd_pushfeeling_button'),document.getElementById('movieadd_pushdvd_button'),document.getElementById('movieadd_share_button'),document.getElementById('movieadd_show_info_button'),document.getElementById('movieadd_back_button')];

    document.getElementById('success_sns_alert').hide();
    utility.removeAttribute_list_object(button_list, 'disabled');
  },
};

var movieadd_feeling = {

  show_contents: function(){
    //アラート表示後に自動フォーカスするためのイベントを登録する
    movieadd_feeling.feeling_input_name_addEvent();

    var nodata_message = document.getElementById('movieadd_feeling_nodata_message');
    var length = movieadd.userdata.feeling_name_list.length;
    if (length === 0) {
      $('#movieadd_feeling_nodata_message').css('height', '100%');
      nodata_message.innerHTML = '感情を1件以上登録してください<br>(1件につき6文字以内)';
    }else {
      $('#movieadd_feeling_nodata_message').css('height', '0%');
      nodata_message.innerHTML = '';

      //リスト表示
      var feeling_list = document.getElementById('feeling_list');
      feeling_list.innerHTML = '';
      for(var i = 0; i < length; i++) {
        feeling_list.innerHTML += '<h3 class="feeling_film" style="opacity: 0; margin-top: 40px;">' + movieadd.userdata.feeling_name_list[i] + '</h3>';
      }

      //アニメーション表示
      var delaySpeed = 50;
      var fadeSpeed = 400;
      $('.feeling_film').each(function(index) {
        $(this).delay(index*delaySpeed).animate({opacity:'1', marginTop: '20px'},fadeSpeed);  
      });
    }
  },

  /**
   * アラート表示後にフォーカスを当てる処理を行う
   */
  feeling_input_name_addEvent: function(){
    document.addEventListener('postshow', function(event) {
      if (event.target.id == 'feeling_add_dialog') {
        document.getElementById('feeling_add_button').setAttribute('disabled');
        document.getElementById('feeling_input_name').focus();
      }
    });
  },

  /**
   * 気分を入力するアラートを表示してinputのvalueを初期化する
   */
  show_input_alert: function(){
    document.getElementById('feeling_add_dialog').show();

    var input_form = document.getElementById('feeling_input_name');
    input_form.value = '';
    input_form.addEventListener('keyup', movieadd_feeling.check_input_form);
  },

  /**
   * フォームの値を監視して登録ボタンの有効・無効を設定する関数
   * @return {[type]} [description]
   */
  check_input_form: function(){
    var value = document.getElementById('feeling_input_name').value;
    var add_button = document.getElementById('feeling_add_button');

    if (value.replace(/\s+/g, '') !== '') {
      add_button.removeAttribute('disabled');
    }else {
      add_button.setAttribute('disabled');
    }
  },

  /**
   * アラートを閉じるor閉じてリストへ追加する関数
   * @param  {[string]} id [cancelかadd]
   */
  hide_input_alert: function(id){
    if (id == 'cancel') {
      document.getElementById('feeling_add_dialog').hide();
    }else {
      var feeling_name = document.getElementById('feeling_input_name').value;
      feeling_name = feeling_name.replace(/\s+/g, '');

      //既出でない場合
      if (movieadd.userdata.feeling_name_list.indexOf(feeling_name) == -1) {
        movieadd_feeling.add_list(feeling_name);
        document.getElementById('feeling_add_dialog').hide();

      //既出の場合
      }else {
        document.getElementById('feeling_add_dialog').hide();
        utility.show_error_alert('登録エラー','既に登録済みです','OK');
      }
    }
  },

  /**
   * 引き数で渡された気分の文字列をリストに表示する
   * @param {[string]} feeling_name [ユーザが入力した気分]
   */
  add_list: function(feeling_name){
    //リスト表示
    movieadd.userdata.feeling_name_list.push(feeling_name);
    movieadd_feeling.show_contents();

    //ラベルの更新
    movieadd.show_feelingAnddvd_label();
  },
};


var movieadd_dvd = {

  /**
   * 保存しているラジオボタンの状態をもとにチェックをつける
   */
  show_contents: function(){
    var dvd_check = movieadd.userdata.dvd;
    var radio_dvd_yes = document.getElementById('radio_dvd_yes');

    if (dvd_check === true) {
      radio_dvd_yes.checked = true;
    }else {
      radio_dvd_yes.checked = false;
    }
  },


  /**
   * movieadd_dvd.html(DVDの所持確認画面)を閉じる時の関数
   */
  close_movieadd_dvd: function(){
    //チェックボタンの状態を保存する
    var yes = document.getElementById('radio_dvd_yes').checked;

    if (yes === true) {
      movieadd.userdata.dvd = true;
    }else {
      movieadd.userdata.dvd = false;
    }

    //ラベルの更新
    movieadd.show_feelingAnddvd_label();
    
    utility.popPage();
  },
};


/**
* 便利関数をまとめたオブジェクト
* @type {Object}
*/
var utility = {
  /**
   * ncmbを生成して返す
   * @return {[object]} [生成したncmb]
   */
  get_ncmb: function(){
    var ncmb = new NCMB(get_ncmb_application_key(),get_ncmb_get_client_key());
    return ncmb;
  },

  /**
   * ローカルストレージの初期化をする
   */
  delete_localstorage: function(){
    var storage = window.localStorage;
    storage.removeItem('username');
    storage.removeItem('password');
    storage.removeItem('birthday');
    storage.removeItem('sex');
    storage.removeItem('signup_flag');
  },

  /**
   * ローカルストレージの状態を表示する
   */
  show_localstorage: function(){
    var storage = window.localStorage;
    var username = storage.getItem('username');
    var password = storage.getItem('password');
    var birthday = storage.getItem('birthday');
    var sex = storage.getItem('sex');
    var signup_flag = storage.getItem('signup_flag');
    var obj = {'username':username, 'password':password, 'birthday':birthday, 'sex':sex, 'signup_flag':signup_flag};
    console.log(obj);
  },


  /**
   * 指定したページの読み込み終了後に指定したcallbackを実行する
   * @param  {[string]}   pageid   [pageのid]
   * @param  {Function} callback [読み込み終了後に実行したいコールバック関数]
   */
  check_page_init: function(pageid,callback){
    document.addEventListener('init', function(event) {
      if (event.target.id == pageid) {
        console.log(pageid + ' is inited');
        callback();
      }
    });
  },

  /**
   * データベースのオブジェクトを返す    
   * @return {[type]} [description]
   */
  get_database: function(){
    var db = window.sqlitePlugin.openDatabase({name: 'my_db', location: 'default'});
    return db;
  },


  /**
   * TMDBのAPIキーを返す
   * @return {[string]} [TMDBのAPIキー]
   */
  get_tmdb_apikey: function(){
    return 'dcf593b3416b09594c1f13fabd1b9802';
  },

  /**
   * htmlファイル、アニメーション、delay時間を指定するとアニメーションを行って画面遷移する
   * @param  {[string]} html_name      [画面遷移したいhtmlファイル名]
   * @param  {[string]} animation_name [アニメーション名]
   * @param  {[number]} delaytime      [Timeoutの時間]
   */
  pushpage: function(html_name, animation_name, delaytime) {
    var showpage = function(){
      document.getElementById('myNavigator').pushPage(html_name, { animation : animation_name });
    };

    setTimeout(showpage, delaytime);
  },

  /**
   * onsen uiのpopPageを実行する関数
   */
  popPage: function(){
    document.getElementById('myNavigator').popPage();
  },


  /**
   * ブラウザで強制的にログインするための関数
   * @return {[type]} [description]
   */
  browser_signup: function(){
    var callback = function(){
      document.getElementById('username').value = 'ブラウザユーザ';
      document.getElementById('password').value = 'password';
      document.getElementById('birthday').value = '1994';

      index.formcheck[0] = true;
      index.formcheck[1] = true;

      var storage = window.localStorage;
      storage.setItem('username', document.getElementById('username').value);
      storage.setItem('password', document.getElementById('password').value);
      storage.setItem('birthday', Number(document.getElementById('birthday').value));
      storage.setItem('sex', 'M');
      storage.setItem('signup_flag', true);
    };
    utility.check_page_init('signup',callback);
  },


  spinner: {},        //spinnerオブジェクト格納用

  /**
   * 指定した親要素にスピナーを表示する
   * @param  {[string]} parent [親要素のid]
   */
  show_spinner: function(parent){
    var opts = {
      lines: 13, //線の数
      length: 8, //線の長さ
      width: 3, //線の幅
      radius: 16, //スピナーの内側の広さ
      corners: 1, //角の丸み
      rotate: 74, //向き(あんまり意味が無い・・)
      direction: 1, //1：時計回り -1：反時計回り
      color: '#000', // 色
      speed: 2.0, // 一秒間に回転する回数
      trail: 71, //残像の長さ
      shadow: true, // 影
      hwaccel: true, // ？
      className: 'spinner', // クラス名
      zIndex: 2e9, // Z-index
      top: '50%', // relative TOP
      left: '50%', // relative LEFT
      opacity: 0.25, //透明度
      fps: 40 //fps
    };

    //重複表示を避けるため既にオブジェクトに格納されていない時のみ処理を行う
    if (Object.keys(utility.spinner).length === 0) {
      //描画先の親要素
      var spin_target = document.getElementById(parent);
      //スピナーオブジェクト
      var spinner = new Spinner(opts);
      utility.spinner = spinner;
      //スピナー描画
      spinner.spin(spin_target);
    }
  },

  /**
   * [スピナーの表示を止める]
   */
  stop_spinner: function(){
    utility.spinner.spin();
    utility.spinner = {};
  },

  /**
   * エラーのアラートを表示する
   * @param  {[string]} title       [タイトル]
   * @param  {[string]} message     [メッセージ]
   * @param  {[string]} buttonLabel [ボタンのラベル]
   */
  show_error_alert: function(title,message,buttonLabel) {
    ons.notification.alert(
    {
        title: title,
        message: message,
        buttonLabel: buttonLabel
    });
  },

  /**
   * TMDBに関するエラーアラートを表示する
   * @param  {[number]} err_status [エラーのHTTPstatus]
   */
  show_tmdb_error: function(err_status) {
    switch(err_status) {
      case 0:
        utility.show_error_alert('通信エラー','ネットワーク接続を確認して下さい','OK');
        break;
      case 401:
        utility.show_error_alert('APIエラー','有効なAPIキーを設定して下さい','OK');
        break;
      case 404:
        utility.show_error_alert('Not found','リソースが見つかりませんでした','OK');
        break;
      default:
        utility.show_error_alert('不明なエラー','不明なエラーが発生しました','OK');
        break;
    }
  },


  /**
   * 画像をbase64エンコードする
   * @param  {[image]} image_src [img要素]
   * @param  {[string]} mine_type [データ型]
   * @return {[promise]}           [成功時：画像をbase64エンコードした文字列]
   */
  image_to_base64: function(image_src, mine_type) {
    return new Promise(function(resolve,reject) {
      var canvas = document.createElement('canvas');
      canvas.width  = image_src.width;
      canvas.height = image_src.height;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(image_src, 0, 0);

      resolve(canvas.toDataURL(mine_type));
    });
  },

  /**
   * base64をデコードする
   * @param  {[string]}   base64img [base64の文字列]
   * @param  {Function} callback  [変換後のコールバック]
   */
  base64_to_image: function(base64img, callback) {
    var img = new Image();
    img.onload = function() {
      callback(img);
    };
    img.src = base64img;
  },

  /**
   * 複数のオブジェクトに同じattributeをセットする
   * @param {[array]} object_list    [attributeをセットしたいオブジェクトを格納した配列]
   * @param {[string]} attribute_name [セットしたいattribute名]
   */
  setAttribute_list_object: function(object_list, attribute_name) {
    for(var i = 0; i < object_list.length; i++) {
      object_list[i].setAttribute(attribute_name);
    }
  },

  /**
   * 複数のオブジェクトから同じattributeを取り除く
   * @param  {[array]} object_list    [attributeを取り除きたいオブジェクトを格納した配列]
   * @param  {[string]} attribute_name [取り除きたいattribute名]
   */
  removeAttribute_list_object: function(object_list, attribute_name) {
    for(var i = 0; i < object_list.length; i++) {
      object_list[i].removeAttribute(attribute_name);
    }
  },

  /**
   * 画面名を指定してカラーコードを取得する関数
   * @param  {[string]} screen_name [画面名]
   * @return {[array]}             [カラーコードが格納された配列]
   */
  get_color_code: function(screen_name) {
    switch(screen_name) {
      case 'movies':
        return ['#a5a5a5','#ffa500','#FF1D00'];
    }
  },
};


/*
  データベース関連のメソッドをまとめたオブジェクト
*/
var db_method = {

  /**
   * 指定したテーブルのレコード件数を返す
   * @param  {[string]} table_name [レコード件数を取得したいテーブル名]
   * @return {[promise]}            [成功時：レコード件数、失敗時：エラーメッセージ]
   */
  count_record: function(table_name) {
    return new Promise(function(resolve,reject) {
      var db = utility.get_database();
      var query = 'SELECT COUNT(*) AS count FROM ' + table_name;
      db.executeSql(query, [], function (resultSet) {
        resolve(JSON.stringify(resultSet.rows.item(0).count));
      }, 
      function(error) {
        console.log('COUNT RECORD ERROR: ' + error.message);
        reject(error.message);
      });
    });
  },

  /**
   * データベースのレコードを全削除する
   */
  delete_all_record: function() {
    var db = utility.get_database();

    db.transaction(function(tx) {
      tx.executeSql('DELETE FROM movie');
      tx.executeSql('DELETE FROM genre');
      tx.executeSql('DELETE FROM onomatopoeia');
    },
    function(err) {
      console.log('DELETE ALL RECORD ERROR: ' +JSON.stringify(err) +' ' + err.message);
    });
  },


  /**
   * シングルSQLを実行する関数
   * @param  {[string]} query     [クエリー文]
   * @param  {[array]} data_list [クエリー内に埋め込む値を格納した配列]
   * @return {[promise]}           [成功時：クエリーの実行結果，失敗時：エラーメッセージ]
   */
  single_statement_execute: function(query,data_list) {
    return new Promise(function(resolve,reject) {
      var db = utility.get_database();

      db.executeSql(query, data_list, function(resultSet) {
        resolve(resultSet);
      },
      function(error) {
        console.log(error.message);
        reject(error.message);
      });
    });
  },
};


//SQLメモ
//"INSERT INTO movie(id,title, tmdb_id, genre_id, onomatopoeia_id, poster) VALUES(1,'test', 10, 'genre_id_hogehoge','onomatopoeia_id_hogehoge','poster_hogehoge')

// //ローカルのデータベースにサーバから取得したmovieを記録する
// function insert_movie(movies){
//     var db = this.get_database();
  
//     for (var i = 0; i < movies.length; i++) {
//         console.log(movies[i]);

//        db.executeSql("INSERT INTO movie(title, tmdb_id, genre_id, keyword_id, onomatopoeia_id, thumbnail_path, username) VALUES('title', 'tmdb_id', 'genre_id')");
//         //id integer primary key, title text unique, tmdb_id integer unique, genre_id text, keyword_id text, onomatopoeia_id text, thumbnail_path text, username text
//     }

//     // db.transaction(function(tx) {
//     //     // console.log('Open database success');
//     //     for (var i = 0; i >= 0; i--) {
//     //         Things[i]
//     //     }
//     //     tx.executeSql('CREATE TABLE IF NOT EXISTS movie (id integer primary key, title text, tmdb_id text, genre_id text, keyword_id text, onomatopoeia_id text, thumbnail text, username text)');
//     //     tx.executeSql('CREATE TABLE IF NOT EXISTS Genre (id integer primary key, name text, username text)');
//     //     tx.executeSql('CREATE TABLE IF NOT EXISTS KeyWord (id integer primary key, name text, username text)');
//     //     tx.executeSql('CREATE TABLE IF NOT EXISTS Onomatopoeia (id integer primary Key, name text, joy_status text, anger_status text, sadness_status text, happiness_status text)');
//     // }, function(err) {
//     //     console.log('Open database ERROR: ' +JSON.stringify(err) +' ' + err.message);
//     //     });
// }
// 
//ログイン中のユーザ名が含まれるMovieオブジェクトを最新順で取得する
// function get_movies_ncmbobject(username, callback){
//     var ncmb = get_ncmb();
//     var Movie = ncmb.DataStore("Movie");
//     Movie.equalTo("UserName", username)
//     .order("updateDate",true)
//     .fetchAll()
//     .then(function(results){
//         insert_movie(results);
//         callback();
//     })
//     .catch(function(err){
//         console.log(err);
//     });
// }
   

app.initialize();
