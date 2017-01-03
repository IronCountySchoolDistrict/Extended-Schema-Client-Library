export class Client {
  constructor(clientData) {
    this.coreTable = clientData.coreTable;
    this.extGroup = clientData.extGroup;
    this.extTable = clientData.extTable;
    this.coreTableNumber = clientData.coreTableNumber;
    this.foreignKey = (clientData.foreignKey !== undefined ? clientData.foreignKey : undefined);
    this.ops = {
      SAVE: 'SAVE', // UPDATE or INSERT
      DELETE: 'DELETE'
    }
  }

  /**
   * Returns an object that contains the parameters for the tlist_child_auth.html page
   * @param  {object} record contains column name to column value mapping
   * @return {object}        object that will be used to populate the tlist_child parameters
   */
  _getAuthMetadata(record) {
    if (!record) {
      throw TypeError('required parameter record is undefined');
    } else if (!Object.keys(record).length) {
      throw TypeError('parameter record is an empty object, must contain at least one key-value pair');
    }
    // filter out object keys that are database keys
    const isDbKey = (elem) => (elem !== 'id' && elem !== 'foreignKey');
    const displayCols = Object.keys(record).filter(isDbKey).join(',');
    return {
      extGroup: this.extGroup,
      extTable: this.extTable,
      displayCols: displayCols,
      fieldNames: displayCols
    };
  }

  _getLocation() {
    return window.location.pathname;
  }

  /**
   * Returns the name of the portal the user is currently on
   * by parsing the what's between the first two slashes in the URL
   * @return {string} portal can be: 'admin', 'teachers', 'guardian'
   */
  _getPortal() {
    var location = this._getLocation();
    var pos = location.indexOf('/', 1);
    if (pos > 0) {
      return location.substring(1, pos);
    }
  }

  /**
   * Encodes an object into a URI parameters string
   * @param  {object} obj object to be encoded
   * @return {string}     uri encoded string serialization of obj
   */
  _encodeUri(obj) {
    return Object.keys(obj).map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])
    }).join('&');
  }

  /**
   * Convert key name for field to tlist format
   * @param  {string} key        column name
   * @param  {string} foreignKey foreignKey of the record -- follows the format ${coreTable}DCID
   * @param  {number} [recordId] id of record to updated
   * @param           op         See this.ops
   * @return {string}            column name converted to tlist format
   */
  _keyToTlist(key, foreignKey, recordId, op) {
    if (!key) {
      throw TypeError('required parameter key is undefined');
    }
    if (!op) {
      throw TypeError('required parameter op is undefined');
    }
    return 'CF-[' +
      this.coreTable +
      ':' +
      foreignKey +
      '.' +
      this.extGroup +
      '.' +
      this.extTable +
      ':' +
      (recordId !== undefined ? recordId : '-1') +
      ']' +
      key;
  }

  _toDeleteTlist(foreignKey, recordId) {
    if (!foreignKey) {
      throw TypeError('required parameter foreignKey is undefined');
    }
    if (!recordId) {
      throw TypeError('required parameter recordId is undefined');
    }

    let key = 'DC-' + this.coreTable + ':' + foreignKey + '.' + this.extGroup + '.' + this.extTable + ':' + recordId;
    let obj = {};
    obj[key] = 'on';
    return obj;
  }

  /**
   * Convert a "plain" object of data, where the column name maps to value,
   * to a new object that maps the form field name as
   * it would be rendered by a tlist_child tag to its value
   * @param  {object} obj object that maps column name to column value
   * @return {object}     object that maps a form field name as it would be rendered by a tlist_child tag to its value
   */
  _objToTlist(obj, op) {
    let newObj = {};
    let recordId = (obj.id !== undefined ? obj.id : undefined);
    let foreignKey = (obj.foreignKey !== undefined ? obj.foreignKey : undefined);
    if (op === this.ops.SAVE) {
      for (let key of Object.keys(obj)) {
        if (key !== 'id' && key !== 'foreignKey') {
          newObj[this._keyToTlist(key, foreignKey, recordId, op)] = obj[key];
        }
      }
      return newObj;
    } else if (op === this.ops.DELETE) {
      return this._toDeleteTlist(foreignKey, recordId);
    }
  }

  /**
   * Converts a simple object of column name to column value mapping
   * to a string that will be sent as a POST request payload
   * @param  {object} record simple object of column name to column value mappings
   * @return {string}        string that will be sent as a POST request payload
   */
  _objToPostStr(record, op) {
    var acString;
    switch (this._getPortal(this._getLocation())) {
      case 'guardian':
        acString = '&ac=autosendupdate';
        break;
      case 'admin':
        acString = '&ac=prim';
        break;
    }

    let tlist = this._objToTlist(record, op);
    console.log('tlist == ', tlist);
    let encodedUri = this._encodeUri(tlist);
    console.log('encodedUri == ', encodedUri + acString);
    return encodedUri + acString;
  }

  /**
   * Use the user's current portal to determine the corresponding form action URL
   * @return {string} form action URL
   */
  _getPostUrl() {
    var postUrl;
    switch (this._getPortal(window.location.pathname)) {
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
    var encodedAuthMetadata = this._encodeUri(authMetadata);
    var portal = this._getPortal(window.location.pathname);
    var authUrl = `/${portal}/escl/tlist_child_auth.html?${encodedAuthMetadata}`;
    console.log(this.coreTableNumber);
    console.log(record.foreignKey);
    if (portal !== 'guardian' && this.coreTableNumber && record.foreignKey) {
      authUrl += `&frn=${this.coreTableNumber}${record.foreignKey}`;
    }
    console.log('authUrl == ', authUrl);
    return window.fetch(authUrl, {credentials: 'include'})
      .then(rawData => rawData.text());
  }


  /**
   * The tlist_child_auth.html page requires at least one field to be passed in,
   * but we can't be sure if a column was passed in with the record object.
   * This function will fetch a column name so it can be passed to _auth.
   *
   * @param  {string} coreTable eg., STUDENTS
   * @param  {string} extendedTable
   * @return {Promise}
   */
  _getSingleCol(coreTable, extendedTable) {
    var portal = this._getPortal(window.location.pathname);
    var url = `/${portal}/get-tab-column.json?coreTable=${coreTable}`;

    return window.fetch(url, {
      method: 'get',
      credentials: 'include'
    })
      .then(function (singleCol) {
        return singleCol.json();
      });
  }

  delete(record) {
    var _this = this;

    let allowedCols = Object.keys(record).filter(elem => elem !== 'id' && elem !== 'foreignKey');
    var authPromise;
    if (!allowedCols.length) {
      authPromise = this._getSingleCol(this.coreTable, this.extTable)
        .then(singleCol => {
          record[singleCol.column_name] = ''; // value doesn't matter here, just the key name
          return this._auth(record);
        })
    } else {
      authPromise = this._auth(record);
    }

    return authPromise
      .then(function () {
        console.log(_this._objToTlist(record, _this.ops.DELETE));
        return window.fetch(_this._getPostUrl(), {
          method: 'post',
          headers: {
            'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: _this._objToPostStr(record, _this.ops.DELETE), // singleCol, if needed, will have been added by now because we then'd authPromise
          credentials: 'include'
        })
      })
      .then(saveResp => saveResp.text())
      .then(function (saveResp) {
        return new Promise((resolve, reject) => {
          if (saveResp.indexOf('Authorization') !== -1) {
            reject(new Error('Request failed'));
          } else {
            resolve(saveResp);
          }
        });
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
      .then(function () {
        return window.fetch(_this._getPostUrl(), {
          method: 'post',
          headers: {
            'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: _this._objToPostStr(record, _this.ops.SAVE),
          credentials: 'include'
        });
      })
      .then(function (saveResp) {
        return saveResp.text();
      })
      .then(function (saveResp) {
        return new Promise((resolve, reject) => {
          if (saveResp.indexOf('Authorization') !== -1) {
            reject(new Error('Request failed'));
          } else {
            resolve(saveResp);
          }
        });
      });
  }
}
