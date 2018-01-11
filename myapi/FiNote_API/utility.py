from FiNote_API.models import *
from myapi.settings import TMDB_APIKEY
import requests


def get_or_create_genre(genre_id):
    # TMDBへのリクエストを生成
    url = 'https://api.themoviedb.org/3/genre/movie/list'
    query = {
        'api_key': TMDB_APIKEY,
        'language': 'ja'
    }

    # TMDBから取得したレスポンスを扱いやすいように変形
    r = requests.get(url, params=query)
    r_json = r.json()
    values = r_json.values()
    list_values = list(values)[0]

    # TMDBから取得したジャンルオブジェクトリストを、idとnameに分けたリストを作成
    genre_value_id = []
    genre_value_name = []
    for genre_value in list_values:
        genre_value_id.append(genre_value['id'])
        genre_value_name.append(genre_value['name'])

    # リクエストされたジャンルidをDB検索して追加・取得 or 取得
    genre_obj_list = []
    for id in genre_id:
        try:
            index = genre_value_id.index(id)
            obj, created = Genre.objects.get_or_create(
                genre_id=id,
                defaults={'genre_id': id, 'name': genre_value_name[index]},
            )

            genre_obj_list.append(obj)
        except ValueError:
            pass

    return genre_obj_list


def add_movie(genre_list, onomatopoeia_list, data):
    # 映画オブジェクトの新規追加 or 取得
    movie_obj, created_movie = Movie.objects.get_or_create(
        tmdb_id=data['tmdb_id'],
        defaults={'title': data['title'],
                  'tmdb_id': data['tmdb_id'],
                  'overview': data['overview'],
                  'poster': data['poster']}
    )

    # 追加した映画にジャンルがなければ新規追加
    for genre_obj in genre_list:
        if not movie_obj.genre.all().filter(name=genre_obj.name).exists():
            movie_obj.genre.add(genre_obj)

    # 追加した映画にオノマトペがなければ新規追加
    for onomatopoeia_obj in onomatopoeia_list:
        if not movie_obj.onomatopoeia.all().filter(name=onomatopoeia_obj.name).exists():
            tmp_movie_onomatopoeia = Movie_Onomatopoeia()
            tmp_movie_onomatopoeia.movie = movie_obj
            tmp_movie_onomatopoeia.onomatopoeia = onomatopoeia_obj
            tmp_movie_onomatopoeia.save()

    # 追加した映画にユーザを新規追加
    if not movie_obj.user.all().filter(username=data['username']).exists():
        user_obj = AuthUser.objects.get(username=data['username'])
        tmp_movie_user = Movie_User()
        tmp_movie_user.movie = movie_obj
        tmp_movie_user.user = user_obj
        tmp_movie_user.save()

    movie_obj.save()

    # オノマトペカウントオブジェクトの新規追加 or 取得
    for onomatopoeia in onomatopoeia_list:
        onomatopoeia_count_obj, created_oc = OnomatopoeiaCount.objects.get_or_create(
            onomatopoeia=onomatopoeia,
            movie=movie_obj,
            defaults={'count': 1, 'onomatopoeia': onomatopoeia, 'movie': movie_obj}
        )

        # オノマトペカウントオブジェクトの更新
        if not created_oc:
            onomatopoeia_count_obj.count += 1
            onomatopoeia_count_obj.save()

    return movie_obj

#
#
# def movie_update_onomatopoeia(request_data, onomatopoeia_list):
#     """
#     This method is update Movie table onomatopoeia column.
#     :param request_data: Request user's data.(username, movie_id(tmdb_id) and onomatopoeia list)
#     :param onomatopoeia_list: Request onomatopoeia list.
#     :return: Onomatopoeia object list.
#
#     :type request_data object
#     :type onomatopoeia_list list
#     """
#
#     movie_obj = Movie.objects.get(tmdb_id=request_data['movie_id'])
#
#     onomatopoeia_obj_list = []
#     for onomatopoeia_name in onomatopoeia_list:
#         onomatopoeia_obj, created = Onomatopoeia.objects.get_or_create(
#             name=onomatopoeia_name,
#             defaults={'name': onomatopoeia_name}
#         )
#         onomatopoeia_obj_list.append(onomatopoeia_obj)
#
#         if movie_obj.onomatopoeia.all().filter(name=onomatopoeia_obj.name).exists():
#             pass
#         else:
#             movie_obj.onomatopoeia.add(onomatopoeia_obj)
#
#     return onomatopoeia_obj_list
#
#
# def onomatopoeia_update_backup(request_data, onomatopoeia_obj_list):
#     """
#     When onomatopoeia update, run this method.
#     This method is clear the back up record after add request onomatopoeia.
#     :param request_data: Request user's data.(username, movie_id(tmdb_id) and onomatopoeia list)
#     :param onomatopoeia_obj_list: Request user's onomatopoeia list object data.
#
#     :type request_data object
#     :type onomatopoeia_obj_list list
#     """
#
#     user_obj = AuthUser.objects.get(username=request_data['username'])
#     movie_obj = Movie.objects.get(tmdb_id=request_data['movie_id'])
#
#     backup_obj = BackUp.objects.get(username=user_obj, movie=movie_obj)
#
#     backup_obj.onomatopoeia.clear()
#
#     for onomatopoeia_obj in onomatopoeia_obj_list:
#         backup_obj.onomatopoeia.add(onomatopoeia_obj)
#
#
# def get_url_param(test, api, request_data):
#     """
#     Return url and params.
#     :param test: True is test, False is real.
#     :param api: Origin is GetOriginalTitle API, else is GetSearchMovieTitleResults.
#     :param request_data: Post data.
#     :return: Url and params.
#
#     :type test bool
#     :type api str
#     :type request_data dict
#     """
#     if api == 'origin':
#         if test:
#             url = 'http://kentaiwami.jp/GetOriginalTitle_en.html/'
#             param = {}
#         else:
#             url = 'https://movies.yahoo.co.jp/movie/' + request_data['id']
#             param = {}
#     else:
#         if test:
#             url = 'http://kentaiwami.jp/GetSearchMovieTitleResults.html/'
#             param = {}
#         else:
#             url = 'https://movies.yahoo.co.jp/movie/'
#             param = {'query': request_data['movie_title'], 'page': request_data['page_number']}
#
#     return url, param
