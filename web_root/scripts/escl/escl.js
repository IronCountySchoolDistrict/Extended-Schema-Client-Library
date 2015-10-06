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

  /**
   * Returns an object that contains the parameters for the tlist_child_auth.html page
   * @param  {object} record contains column name to column value mapping
   * @return {object}        object that will be used to populate the tlist_child parameters
   */
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

  /**
   * Returns the name of the portal the user is currently on
   * by parsing the what's between the first two slashes in the URL
   * @return {string} portal can be: 'admin', 'teachers', 'guardian'
   */
  _getPortal() {
    var path = window.location.pathname;
    var pos = path.indexOf('/', 1);
    if (pos > 0) {
      path = path.substring(1, pos);
    }
    return path;
  }

  /**
   * Encodes an object into a URI parameters string
   * @param  {object} obj object to be encoded
   * @return {string}     uri encoded string serialization of obj
   */
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

  /**
   * Convert a "plain" object of data, where the column name maps to value,
   * to a new object that maps the form field name as
   * it would be rendered by a tlist_child tag to its value
   * @param  {object} obj object that maps column name to column value
   * @return {object}     object that maps a form field name as it would be rendered by a tlist_child tag to its value
   */
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

  /**
   * Converts a simple object of column name to column value mapping
   * to a string that will be sent as a POST request payload
   * @param  {object} record simple object of column name to column value mappings
   * @return {string}        string that will be sent as a POST request payload
   */
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

  /**
   * Use the user's current portal to determine the corresponding form action URL
   * @return {string} form action URL
   */
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

  /**
   * Executes a GET request to a page that contains all of the fields that we will be saving,
   * thus authenticating the POST request in save()
   * @param  {object} record simple object of column name to column value mappings
   * @return {Promise}       Resolves when the auth request's full response has arrived
   */
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

  /**
   * Sends a POST request to save (either insert or update) the record
   * @param  {object} record simple object of column name to column value mappings
   * @return {Promise}       Resolves when the POST request full response has arrived.
   * Rejects if the POST request's response contains an Authorization error.
   */
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
