export class Client {
  constructor(clientData) {
    this.coreTable = clientData.coreTable;
    this.extGroup = clientData.extGroup;
    this.extTable = clientData.extTable;
    this.displayCols = clientData.displayCols;
    this.fieldNames = clientData.fieldNames;
    this.coreTableNumber = clientData.coreTableNumber;
    this.foreignKey = (clientData.foreignKey !== undefined ? clientData.foreignKey : undefined);
    this.id = (clientData.id !== undefined ? clientData.id : undefined);
  }

  _getAuthMetadata() {
    return {
      extGroup: this.extGroup,
      extTable: this.extTable,
      displayCols: this.displayCols,
      fieldNames: this.fieldNames
    }
  }

  _getPortal() {
    var path = window.location.pathname;
    var pos = path.indexOf('/', 1);
    if (pos > 0) {
      path = path.substring(1, pos);
    }
    return path;
  }

  _auth(record) {
    var authMetadata = this._getAuthMetadata();
    var authUrl = `/${this._getPortal()}/tlist_child_auth.html?${this._encodeUri(authMetadata)}`;
    if (getPortal() !== 'guardian') {
      authUrl += `&frn=${this.coreTableNumber}${this.foreignKey}`;
    }
    return fetch(authUrl, {
      credentials: 'include'
    }).then(function(rawData) {
      return rawData.text()
    });
  }

  save(record) {
    var _this = this;
    return this._auth(record)
      .then(function() {
        return fetch(_this._getPostUrl(), {
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
        return new Promise(function() {
          resolve(saveResp)
        }, function() {
          if (saveResp.indexOf('Authorization') !== -1) {
            throw 'Request failed';
          }
        })
      });
  }

  _encodeUri(obj) {
    return Object.keys(obj).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    }).join('&');
  }

  /**
   * Convert key name for field to tlist format
   * @param  {object} record object that holds data to be saved
   * @param  {string} key    column name
   * @return {string}        column name converted to tlist format
   */
  _keyToTlist(key) {
    return 'CF-[' +
      this.coreTable +
      ':' +
      (this.foreignKey !== undefined ? this.foreignKey : 0) +
      '.' +
      this.extGroup +
      '.' +
      this.extTable +
      ':' +
      (this.id !== undefined ? this.id : '-1') +
      ']' +
      key;
  }

  _objToTlist(obj) {
    let newObj = {};
    for (let key of Object.keys(obj)) {
      newObj[this._keyToTlist(key)] = obj[key];
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
        acString = '&ac=prim'
        break;
    }
    console.log(this._encodeUri(this._objToTlist(record)) + acString);
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
    };
    return postUrl;
  }
}
