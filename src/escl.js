class Client {
  constructor(table) {
    this.coretable = table.coretable'Students',
    this.ext_group = table.ext_group,
    this.ext_table = table.ext_table,
    this.displaycols = Object.keys(table.displaycols).join(','),
    this.fieldnames = Object.keys(table.fieldnames).join(','),
    this.coreTableNumber = table.coreTableNumber
  }
}

function encodeUri(obj) {
  return Object.keys(obj).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }).join('&');
}

function keyToTlist(data, key) {
  return 'CF-[' +
    data._coretable +
    ':' +
    (data.studentsdcid !== undefined ? data.studentsdcid : 0) +
    '.' +
    data._ext_group +
    '.' +
    data._ext_table +
    ':' +
    data.id +
    ']' +
    key;
}

function objToTlist(obj) {
  var newObj = {};
  for (let key of Object.keys(obj)) {
    newObj[keyToTlist(key)] = obj[key];
  }
  return newObj;
}

function getPortal() {
  var path = window.location.pathname;
  var pos = path.indexOf('/', 1);
  if (pos > 0) {
    path = path.substring(1, pos);
  }
  return path;
}

function getPostUrl() {
  var postUrl;
  switch (getPortal()) {
    case 'guardian':
      postUrl = '/guardian/changesrecorded.html';
      break;
    case 'admin':
      postUrl = '/admin/changesrecorded.white.html';
      break;
  };
  return postUrl;
}

function objToPostStr(obj) {
  return encodeUri(objToTlist(obj)) + '&ac=autosendupdate';
}

var emailData = {
  email_address: 'herpderp@gmail.com',
  opts_high_priority: 1,
  opts_attendance: 1
};

var tableData = {

};

var recordData = {
  studentsdcid: 24524,
  id: '-1'
};

function auth(data) {
  var authUrl = `${getPortal()}/guardian/tlist_auth.html?${encodeUri(data._tableData)}`;
  if (getPortal() !== 'guardian') {
    authUrl += `&frn=${data._coreTableNumber}${data.studentsdcid}`;
  }
  return fetch(authUrl, {
    credentials: 'include'
  }).then(function(rawData) {
    return rawData.text()
  });
}

export function save(data) {
  return auth()
    .then(function() {
      return fetch(getPostUrl(), {
        method: 'post',
        headers: {
          'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: objToPostStr(data),
        credentials: 'include'
      });
    })
    .then(function(saveResp) {
      return saveResp.text();
    })
    .then(function(saveResp) {
      console.log(saveResp);
    });
}
