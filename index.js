#!/usr/local/bin/node

const fs = require('fs');
const path = require('path');
const request = require('request');

var wxConf = {
    grantType: 'client_credential',
    appid: 'wxca6820724388eeaf', //wx_conf.appId,
    secret: '11760cd2d0f39ea98823b9a6b8c95da1', //wx_conf.appSecret
}

function getToken(appid, appsec, type = 'client_credential') {
    const file = 'mp-token'

    return new Promise((resolve, reject) => {
        let token = {
            access_token: '',
            expires_in: 7200,
            last_update: 0
        }
        if (fs.existsSync(file)) {
            // Load token from cache
            let data = fs.readFileSync(file, 'utf-8')
            let token_cache = JSON.parse(data)
            const diff = (new Date().getTime() / 1000) - token_cache.last_update
            const mark = token_cache.expires_in * .9
            if (diff < mark) {
                console.log('get token from cache', token)
                resolve(token_cache)
                return
            }
        }

        request({
            method: 'GET',
            url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=${type}&appid=${appid}&secret=${appsec}`
        }, function (err, res, body) {
            if (res) {
                let token = JSON.parse(body)
                token.last_update = (new Date().getTime() / 1000)
                fs.writeFileSync(file, JSON.stringify(token))
                resolve(token)
            } else {
                console.log(err);
                reject(err);
            }
        })
    })
}


function getQrcode(token, path, params) {
    return new Promise((resolve, reject) => {
        const api = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${token}`
        const query = Object.keys(params).map(key => {
            // TODO: URL encode
            return `${key}=${params[key]}`
        })
        const data = {
            // Mini app launch path
            path: `${path}?${query.join('&')}`,
            // Qrcode size
            width: 400,
        }

        filename = "./aaa.jpg"

        request({
            method: 'POST',
            url: api,
            body: JSON.stringify(data)
        }, (err, res) => {
            if (err || res.errmsg) {
                reject(err)
                return
            }
            resolve({
                filename,
                body: res.body
            })
        }).pipe(fs.createWriteStream(filename, {
            flags: 'w+'
        }))
    })
}


getToken(wxConf.appid, wxConf.secret, wxConf.grantType)
    .then(token => {
        getQrcode(token.access_token, 'pages/live/live', {
                store: '上海门店上海门店上海门店',
                store_p: '内蒙',
                store_c: '刘刘哈尔刘刘哈尔刘刘哈尔'
            })
            .then(res => {
                console.log('QR loaded')
                // console.log(res)
                if (res.errmsg) {
                    console.log(res)
                    return
                }

                // const fd = fs.openSync('qrcode.png', 'w+')
                // fs.writeSync(fd, res)
                fs.writeFileSync('qrimg.jpg', res, 'binary')
            })
            .catch(err => {
                console.log('load qr error', err)
            })
    })
    .catch(err => {
        console.log('token load error', err)
    });


// const img = fs.readFileSync('qrimg.jpg')
// console.log(img)