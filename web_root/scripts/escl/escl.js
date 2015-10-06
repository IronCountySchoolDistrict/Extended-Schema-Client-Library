/*global require,window,getPortal*/
require.config({
  paths: {
    fetch: 'https://cdnjs.cloudflare.com/ajax/libs/fetch/0.9.0/fetch'
  }
});

if (!window.fetch) {
  var fetch = require('fetch');
}

export class Client {
  constructor(clientData) {
    this.coreTable = clientData.coreTable;
    this.extGroup = clientData.extGroup;
    this.extTable = clientData.extTable;
    this.coreTableNumber = clientData.coreTableNumber;
    this.foreignKey = (clientData.foreignKey !== undefined ? clientData.foreignKey : undefined);
  }

  _getAuthMetadata(record) {
    return {
      extGroup: this.extGroup,
      extTable: this.extTable,
      displayCols: Object.keys(record).filter((elem) => {
        return elem !== 'id';
      }).join(','),
      fieldNames: Object.keys(record).filter((elem) => {
        return elem !== 'id';
      }).join(',')
    };
  }

  _getPortal() {
    var path = window.location.pathname;
    var pos = path.indexOf('/', 1);
    if (pos > 0) {
      path = path.substring(1, pos);
    }
    return path;
  }



  _encodeUri(obj) {
    return Object.keys(obj).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    }).join('&');
  }

  /**
   * Convert key name for field to tlist format
   * @param  {string} key        column name
   * @param  {number} [recordId] id of record to updated
   * @return {string}            column name converted to tlist format
   */
  _keyToTlist(key, recordId) {
    return 'CF-[' +
      this.coreTable +
      ':' +
      (this.foreignKey !== undefined ? this.foreignKey : 0) +
      '.' +
      this.extGroup +
      '.' +
      this.extTable +
      ':' +
      (recordId !== undefined ? recordId : '-1') +
      ']' +
      key;
  }

  _objToTlist(obj) {
    let newObj = {};
    let recordId = (obj.id !== undefined ? obj.id : undefined);
    for (let key of Object.keys(obj)) {
      if (key !== 'id') {
        newObj[this._keyToTlist(key, recordId)] = obj[key];
      }
    }
    return newObj;
  }

  _objToPostStr(record) {
    var acString;
    switch (this._getPortal()) {
      case 'guardian':
        acString = '&ac=autosendupdate';
        break;
      case 'admin':
        acString = '&ac=prim';
        break;
    }

    return this._encodeUri(this._objToTlist(record)) + acString;
  }

  _getPostUrl() {
    var postUrl;
    switch (this._getPortal()) {
      case 'guardian':
        postUrl = '/guardian/changesrecorded.html';
        break;
      case 'admin':
        postUrl = '/admin/changesrecorded.white.html';
        break;
    }
    return postUrl;
  }

  _auth(record) {
    var authMetadata = this._getAuthMetadata(record);
    var authUrl = `/${this._getPortal()}/tlist_child_auth.html?${this._encodeUri(authMetadata)}`;
    if (getPortal() !== 'guardian') {
      authUrl += `&frn=${this.coreTableNumber}${this.foreignKey}`;
    }
    return fetch(authUrl, {
      credentials: 'include'
    }).then(function(rawData) {
      return rawData.text();
    });
  }

  save(record) {
    var _this = this;
    return this._auth(record)
      .then(function() {
        return window.fetch(_this._getPostUrl(), {
          method: 'post',
          headers: {
            'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: _this._objToPostStr(record),
          credentials: 'include'
        });
      })
      .then(function(saveResp) {
        return saveResp.text();
      })
      .then(function(saveResp) {
        return new Promise(function(resolve, reject) {
          if (saveResp.indexOf('Authorization') !== -1) {
            reject('Request failed');
          } else {
            resolve(saveResp);
          }
        });
      });
  }
}
