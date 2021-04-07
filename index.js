/**
 * 批量生成小程序参数二维码
 *
 * 使用说明:
 * 1. 复制 config.tpl.json, 并改名为 config.json. 根据文件里的说明做好配置
 * 2. 复制 qrcodes.tpl.xlsx, 并改名为 qrcodes.xlsx. 将小程序链接参数按格式
 *    填好各参数
 * 3. node index.js
 */
const fs = require('fs');
const path = require('path');
const request = require('request');
const { sleep, msleep } = require('sleep');
const XLSX = require('xlsx');

const wxConf = {
    grantType: 'client_credential',
    appid: '--appid-required--', //wx_conf.appId,
    secret: '--secret-required--', //wx_conf.appSecret
}

function loadConfig() {
    let json = fs.readFileSync('config.json', 'utf-8')
    json = json.replace(/\/\/.*[\r\n]/g, '')
    const conf = JSON.parse(json)
    Object.assign(wxConf, conf)
    return wxConf
}

function getToken(appid, appsec, type = 'client_credential') {
    const file = '.mp-token'

    return new Promise((resolve, reject) => {
        if (fs.existsSync(file)) {
            // Load token from cache
            let data = fs.readFileSync(file, 'utf-8')
            let token_cache = JSON.parse(data)
            const diff = (new Date().getTime() / 1000) - token_cache.last_update
            const mark = token_cache.expires_in * .9
            if (diff < mark) {
                Object.assign(wxConf, token_cache)
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
                Object.assign(wxConf, token)
                resolve(token)
            } else {
                console.log(err);
                reject(err);
            }
        })
    })
}


function getQrcode(token, id, path, params) {
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
            width: wxConf.width,
        }

        filename = `./output/${id}.jpg`

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
                filename: `./output/${id}.jpg`,
                body: res.body
            })
        }).pipe(fs.createWriteStream(filename, {
            flags: 'w+'
        }))
    })
}

function generateQR(id, path, query) {
    getToken(wxConf.appid, wxConf.secret, wxConf.grantType)
        .then(token => {
            getQrcode(token.access_token, id, path, query)
                .then(res => {
                    // console.log('QR generated: ', res.filename)
                })
                .catch(err => {
                    console.log('load qr error', err)
                })
        })
        .catch(err => {
            console.log('token load error', err)
        });
}


const conf = loadConfig()

const wb = XLSX.readFile('qrcodes.xlsx')
const sheet = wb.Sheets[wb.SheetNames[0]]
let curRow = 2
const fields = wxConf.fields
const fieldTotal = wxConf.fields.length
while (curRow > 0) {
    qrinfo = {}
    for (let curCol = 0; curCol < fieldTotal; curCol++) {
        cellId = String.fromCharCode(65 + curCol) + curRow
        cell = sheet[cellId]

        if (curCol === 0 && (!cell || !cell.v)) {
            curRow = -1
            qrinfo = null
            break;
        }

        qrinfo[fields[curCol]] = cell.v
        if (curCol === 0) {
            qrinfo['i__d'] = cell.v
        }
    }
    curRow ++

    if (!qrinfo) {
        continue
    }

    let id = qrinfo.i__d
    delete qrinfo.i__d

    console.log('generate qrcode for ', id)
    // console.log(qrinfo)
    generateQR(id, wxConf.path, qrinfo)

    msleep(100)
}

// Wait for image download
msleep(1500)
console.log('Miniapp QRCode generate completed.')