//
//  UserDetailFormViewController.swift
//  FiNote
//
//  Created by 岩見建汰 on 2018/01/28.
//  Copyright © 2018年 Kenta. All rights reserved.
//

import UIKit
import Eureka
import KeychainAccess
import NVActivityIndicatorView
import Alamofire
import SwiftyJSON
import PopupDialog


class UserDetailFormViewController: FormViewController {

    var api_name = ""
    var screen_title = ""
    
    let keychain = Keychain()
    var username = ""
    var password = ""
    var email = ""
    var birthyear = ""
    
    fileprivate let utility = Utility()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        LabelRow.defaultCellUpdate = { cell, row in
            cell.contentView.backgroundColor = .red
            cell.textLabel?.textColor = .white
            cell.textLabel?.font = UIFont.boldSystemFont(ofSize: 13)
            cell.textLabel?.textAlignment = .right
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        username = (try! keychain.get("username"))!
        password = (try! keychain.get("password"))!
        email = (try! keychain.get("email"))!
        birthyear = (try! keychain.get("birthyear"))!
        
        CreateForm()
        
        self.navigationItem.title = screen_title
        let check = UIBarButtonItem(image: UIImage(named: "icon_check"), style: .plain, target: self, action: #selector(TapCheckButton))
        self.navigationItem.setRightBarButton(check, animated: true)
    }
    
    @objc func TapCheckButton() {
        var err = 0
        for row in form.allRows {
            err += row.validate().count
        }
        
        if err == 0 {
            CallUpdateAPI()
        }else {
            utility.showStandardAlert(title: "Error", msg: "入力を再確認してください", vc: self)
        }
    }
    
    func GetParamsURL() -> (params:[String:Any], url: String) {
        let base = API.base.rawValue+API.v1.rawValue+API.user.rawValue+API.update.rawValue
        switch api_name {
        case "password":
            return ([
                "username": username,
                "now_password": form.values()["now_pass"] as! String,
                "new_password": form.values()["new_pass"] as! String
            ], base+API.password.rawValue)
        case "email":
            return ([
                "username": username,
                "password": form.values()["now_pass"] as! String,
                "new_email": form.values()["new_email"] as! String
            ], base+API.email.rawValue)
        case "birthyear":
            var param = [
                "username": username,
                "password": form.values()["now_pass"] as! String
            ] as [String:Any]
            
            let birthyear_tmp = form.values()["birthyear"] as! String
            if let birthyear = Int(birthyear_tmp) {
                param["birthyear"] = birthyear
            }
            
            return (param, base+API.birthyear.rawValue)
        default:
            return ([:], "")
        }
    }
    
    func CallUpdateAPI() {
        let params_url = GetParamsURL()
        let activityData = ActivityData(message: "Updating", type: .lineScaleParty)
        NVActivityIndicatorPresenter.sharedInstance.startAnimating(activityData, nil)
        
        DispatchQueue(label: "update-user-info").async {
            Alamofire.request(params_url.url, method: .post, parameters: params_url.params, encoding: JSONEncoding.default).responseJSON { (response) in
                NVActivityIndicatorPresenter.sharedInstance.stopAnimating(nil)
                
                guard let res = response.result.value else{return}
                let obj = JSON(res)
                print("***** API results *****")
                print(obj)
                print("***** API results *****")
                
                if self.utility.isHTTPStatus(statusCode: response.response?.statusCode) {
                    // 対象となるキーが含まれている場合のみ値を更新
                    if self.form.values()["new_pass"] != nil {
                        try! self.keychain.set(self.form.values()["new_pass"] as! String, key: "password")
                    }
                    
                    if self.form.values()["new_email"] != nil {
                        try! self.keychain.set(self.form.values()["new_email"] as! String, key: "email")
                    }
                    
                    if self.form.values()["birthyear"] != nil {
                        let tmp_birthyear = self.form.values()["birthyear"] as! String
                        if let _ = Int(tmp_birthyear) {
                            try! self.keychain.set(tmp_birthyear, key: "birthyear")
                        }else {
                            try! self.keychain.set("", key: "birthyear")
                        }
                    }
                    
                    // 成功時のポップアップ
                    let ok = DefaultButton(title: "OK", action: {
                        self.navigationController?.popViewController(animated: true)
                    })
                    let popup = PopupDialog(title: "Success", message: "情報を更新しました")
                    popup.transitionStyle = .zoomIn
                    popup.addButtons([ok])
                    self.present(popup, animated: true, completion: nil)
                }else {
                    self.utility.showStandardAlert(title: "Error", msg: obj.arrayValue[0].stringValue, vc: self)
                }
            }
        }
    }
    
    func CreateForm() {
        UIView.setAnimationsEnabled(false)
        form.removeAll()
        
        let section = Section("")
        
        switch api_name {
        case "password":
            screen_title = "Edit Password"
            section.append(CreatePassWordRow(title: "現在のパスワード", tag: "now_pass"))
            section.append(CreatePassWordRow(title: "新しいパスワード", tag: "new_pass"))
        case "email":
            screen_title = "Edit Email"
            section.append(CreateTextRow(title: "現在のアドレス", value: email, tag: "now_email", disabled: true))
            section.append(CreatePassWordRow(title: "パスワード", tag: "now_pass"))
            section.append(CreateTextRow(title: "新しいアドレス", tag: "new_email", disabled: false))
        case "birthyear":
            screen_title = "Edit birthyear"
            section.append(CreatePassWordRow(title: "パスワード", tag: "now_pass"))
            section.append(CreatePickerInputRow(value: birthyear))
        default:
            screen_title = ""
            break
        }
        
        form.append(section)
        
        UIView.setAnimationsEnabled(true)
    }
    
    func SetAPIName(name: String) {
        api_name = name
    }
    
    func CreatePassWordRow(title: String, tag: String) -> PasswordRow {
        let row = PasswordRow()
        row.title = title
        row.value = ""
        row.add(rule: RuleRequired(msg: "必須項目です"))
        row.validationOptions = .validatesOnChange
        row.tag = tag
        row.onRowValidationChanged { cell, row in
            self.utility.showRowError(row: row)
        }
        
        return row
    }
    
    func CreateTextRow(title: String, value: String="", tag: String, disabled: Condition) -> TextRow {
        let row = TextRow()
        row.title = title
        row.value = value
        row.disabled = disabled
        row.add(rule: RuleRegExp(regExpr: "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}", allowsEmpty: false, msg: "メールアドレスの形式を再確認してください"))
        row.validationOptions = .validatesOnChange
        row.tag = tag
        row.onRowValidationChanged { cell, row in
            self.utility.showRowError(row: row)
        }
        
        return row
    }
    
    func CreatePickerInputRow(value: String) -> PickerInputRow<String> {
        let options = utility.getBirthYears()
        var birthyear = value
        if value.isEmpty {
            birthyear = options[0]
        }
        
        let row = PickerInputRow<String>()
        row.title = "BirthYear"
        row.value = birthyear
        row.options = options
        row.tag = "birthyear"
        return row
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
    }
}
