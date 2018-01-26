//
//  MovieDetailViewController.swift
//  FiNote
//
//  Created by 岩見建汰 on 2018/01/25.
//  Copyright © 2018年 Kenta. All rights reserved.
//

import UIKit
import NVActivityIndicatorView
import SwiftyJSON
import Alamofire
import AlamofireImage
import KeychainAccess
import PopupDialog
import TinyConstraints
import Floaty

class MovieDetailViewController: UIViewController {

    var movie_id = ""
    var user_id = ""
    var movie = Movie.Data()
    
    var contentView = UIView()
    var tmp_poster = UIImageView()
    var latestView = UIView()
    var is_done_api = false
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.view.backgroundColor = UIColor.white
        self.navigationItem.title = "Detail Movie"
        
        let keychain = Keychain()
        user_id = (try! keychain.getString("id"))!
        
        CallMovieAPI()
    }
    
    func SetMovieID(movie_id: String) {
        self.movie_id = movie_id
    }
    
    func InitScrollView() {
        let scrollView = UIScrollView()
        scrollView.frame = CGRect(x: 0, y: 0, width: self.view.bounds.width, height: self.view.bounds.height)
        self.view.addSubview(scrollView)
        
        scrollView.top(to: self.view)
        scrollView.leading(to: self.view)
        scrollView.trailing(to: self.view)
        scrollView.bottom(to: self.view)
        
        contentView = UIView()
        scrollView.addSubview(contentView)
        contentView.top(to: scrollView)
        contentView.leading(to: scrollView)
        contentView.trailing(to: scrollView)
        contentView.bottom(to: scrollView)
        contentView.width(to: scrollView)
    }
    
    func InitPosterView() {
        let posterImageView = UIImageView()
        posterImageView.image = tmp_poster.image
        posterImageView.layer.shadowOpacity = 0.5
        posterImageView.layer.shadowColor = UIColor.black.cgColor
        posterImageView.layer.shadowOffset = CGSize(width: 1, height: 1)
        posterImageView.layer.shadowRadius = 3
        posterImageView.layer.masksToBounds = false
        contentView.addSubview(posterImageView)
        
        posterImageView.top(to: contentView, offset: 50)
        posterImageView.centerX(to: contentView)
        posterImageView.width(200)
        posterImageView.height(300)
        
        latestView = posterImageView
    }
    
    func InitFloaty() {
        let delete_item = FloatyItem()
        delete_item.title = "Delete Movie"
        delete_item.buttonColor = UIColor.hex(Color.red.rawValue, alpha: 1.0)
        delete_item.icon = UIImage(named: "icon_trash")
        delete_item.handler = { (hoge) in
            print("TAP")
        }
        
        let floaty = Floaty()
        floaty.addItem("Edit Info", icon: UIImage(named: "icon_list")) { (hoge) in
            print("TAP")
        }
        
        floaty.addItem(item: delete_item)
        
        floaty.buttonColor = UIColor.hex(Color.main.rawValue, alpha: 1.0)
        floaty.buttonImage = UIImage(named: "icon_edit")
        floaty.rotationDegrees = 0.0
        self.view.addSubview(floaty)
    }
    
    func InitTitleView() {
        let titleView = UILabel()
        let offset = 28 as CGFloat
        titleView.textAlignment = .center
        titleView.lineBreakMode = .byWordWrapping
        titleView.numberOfLines = 0
        titleView.font = UIFont.systemFont(ofSize: 22)
        titleView.text = movie.title
        contentView.addSubview(titleView)
        
        titleView.topToBottom(of: latestView, offset: 50)
        titleView.leading(to: contentView, offset: offset)
        titleView.centerX(to: contentView)
        titleView.trailing(to: contentView, offset: -offset)
        
        latestView = titleView
    }
    
    func InitOverView() {
        let overviewView = UILabel()
        let offset = 28 as CGFloat
        overviewView.textAlignment = .center
        overviewView.lineBreakMode = .byWordWrapping
        overviewView.numberOfLines = 0
        overviewView.font = UIFont.systemFont(ofSize: 16)
        overviewView.text = movie.overview
        contentView.addSubview(overviewView)

        overviewView.topToBottom(of: latestView, offset: 10)
        overviewView.leading(to: contentView, offset: offset)
        overviewView.centerX(to: contentView)
        overviewView.trailing(to: contentView, offset: -offset)
        
        latestView = overviewView
    }
    
    func InitAddInfoView() {
        let icon_wh = 25 as CGFloat
        let add_icon = UIImageView(image: UIImage(named: "icon_add_list"))
        add_icon.image = add_icon.image!.withRenderingMode(.alwaysTemplate)
        add_icon.tintColor = UIColor.hex(Color.gray.rawValue, alpha: 1.0)
        contentView.addSubview(add_icon)
        
        add_icon.topToBottom(of: latestView, offset: 10)
        add_icon.centerX(to: contentView, offset: -50)
        add_icon.width(icon_wh)
        add_icon.height(icon_wh)
        
        let add_date = UILabel()
        add_date.font = UIFont.systemFont(ofSize: 16)
        add_date.textColor = UIColor.hex(Color.gray.rawValue, alpha: 1.0)
        add_date.text = movie.add
        contentView.addSubview(add_date)
        
        add_date.centerY(to: add_icon, offset: 0)
        add_date.leadingToTrailing(of: add_icon, offset: 10)
        
        latestView = add_date
        
        contentView.bottom(to: latestView, offset: 100)
    }
    
    func TapDeleteButton(sender: UIButton) {
        print("TAP")
    }
    
    func CallMovieAPI() {
        let urlString = API.base.rawValue+API.v1.rawValue+API.movie.rawValue+API.detail.rawValue+"?user_id=\(self.user_id)&movie_id=\(self.movie_id)"
        let activityData = ActivityData(message: "Get Movie", type: .lineScaleParty)
        NVActivityIndicatorPresenter.sharedInstance.startAnimating(activityData)
        
        DispatchQueue(label: "get-movie").async {
            Alamofire.request(urlString, method: .get).responseJSON { (response) in
                let obj = JSON(response.result.value)
                print("***** API results *****")
                print(obj)
                print("***** API results *****")
                
                if IsHTTPStatus(statusCode: response.response?.statusCode) {
                    self.movie = Movie().GetData(json: obj)
                    self.tmp_poster.af_setImage(withURL: URL(string: API.poster_base.rawValue+self.movie.poster)!)
                    NVActivityIndicatorPresenter.sharedInstance.stopAnimating()
                    self.is_done_api = true
                    self.DrawViews()
                }else {
                    let popup = PopupDialog(title: "Error", message: obj.arrayValue[0].stringValue)
                    let button = DefaultButton(title: "OK", dismissOnTap: true) {}
                    popup.addButtons([button])
                    
                    NVActivityIndicatorPresenter.sharedInstance.stopAnimating()
                    self.present(popup, animated: true, completion: nil)
                }
            }
        }
    }
    
    func DrawViews() {
        InitScrollView()
        InitPosterView()
        InitFloaty()
        InitTitleView()
        InitOverView()
        InitAddInfoView()
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
    }
}
