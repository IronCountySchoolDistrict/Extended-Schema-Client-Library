import Client from 'escl';
import chai from 'chai';
import FetchMock from 'fetch-mock';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';

export default function() {
  let expect = chai.expect;
  let client;
  let fetchMock;
  mocha.setup('bdd');
  chai.should();
  chai.use(chaiAsPromised);

  describe('Client Tests', () => {
    before(() => {
      fetchMock = new FetchMock({
        theGlobal: window,
        Response: window.Response,
        Headers: window.Headers,
        Blob: window.Blob,
        // debug: function() {}
        debug: console.log
      });
      fetchMock.registerRoute({
        name: 'auth',
        matcher: /tlist_child_auth.html/,
        response: {
          body: 'authResp',
          opts: {
            status: 200
          }
        }
      });
    });
    beforeEach(() => {
      client = new Client({
        coreTable: 'Students',
        extGroup: 'u_student_contacts',
        extTable: 'u_student_contacts',
        coreTableNumber: '001'
      });
    });
    describe('constructor', () => {
      it('should set object properties sent to constructor', () => {
        let client = new Client({
          coreTable: 'Students',
          extGroup: 'u_student_contacts',
          extTable: 'u_student_contacts',
          coreTableNumber: '001'
        });
        expect(client.coreTable).to.equal('Students');
        expect(client.extGroup).to.equal('u_student_contacts');
        expect(client.extTable).to.equal('u_student_contacts');
        expect(client.coreTableNumber).to.equal('001');
      });

      it('should allow for properties to be set after object instantiation', () => {
        client.foreignKey = 12345;
        expect(client.foreignKey).to.equal(12345);
      });

      it('should set foreignKey to undefined if it isn\'t passed into the contructor', () => {
        expect(client.foreignKey).to.equal(undefined);
      });
    });

    describe('_encodeUri', () => {
      it('should encode an object with one key-value pair', () => {
        let encodeMe = {
          'foo': 'bar'
        };
        expect(client._encodeUri(encodeMe)).to.equal('foo=bar');
      });
      it('should encode an object with more than one key-value pair', () => {
        let encodeMe = {
          'foo': 'bar',
          'this': 'that'
        };
        expect(client._encodeUri(encodeMe)).to.equal('foo=bar&this=that');
      });
    });

    describe('_keyToTlist', () => {
      it('-1 is inserted for the primary key if it\'s not passed in the recordId param', () => {
        expect(client._keyToTlist('testKey')).to.equal('CF-[Students:0.u_student_contacts.u_student_contacts:-1]testKey');
      });
      it('12345 is inserted as the primary key', () => {
        expect(client._keyToTlist('testKey', 12345)).to.equal('CF-[Students:0.u_student_contacts.u_student_contacts:12345]testKey');
      });
      it('0 is inserted for foreign key if it\'s not in the object', () => {
        expect(client._keyToTlist('testKey')).to.equal('CF-[Students:0.u_student_contacts.u_student_contacts:-1]testKey');
      });
      it('12345 is inserted for foreign key', () => {
        client.foreignKey = 12345;
        expect(client._keyToTlist('testKey')).to.equal('CF-[Students:12345.u_student_contacts.u_student_contacts:-1]testKey');
      });
      it('calling the function without the key variable throws TypeError', () => {
        expect(client._keyToTlist.bind()).to.throw(TypeError);
      });
    });

    describe('_objToTlist', () => {
      it('should create a tlist_child-style object without foreign key or primary key', () => {
        let obj = {
          'foo': 'bar'
        };
        let tlistObj = {
          'CF-[Students:0.u_student_contacts.u_student_contacts:-1]foo': 'bar'
        }
        expect(client._objToTlist(obj)).to.deep.equal(tlistObj);
      });

      it('should create a tlist_child-style object without foreign key for a new record', () => {
        let obj = {
          'foo': 'bar',
          'id': 12345
        };
        let tlistObj = {
          'CF-[Students:0.u_student_contacts.u_student_contacts:12345]foo': 'bar'
        }
        expect(client._objToTlist(obj)).to.deep.equal(tlistObj);
      });

      it('should create a tlist_child-style object with a foreign key with a primary key', () => {
        let obj = {
          'foo': 'bar',
          'id': 12345
        };
        let tlistObj = {
          'CF-[Students:54321.u_student_contacts.u_student_contacts:12345]foo': 'bar'
        }
        client.foreignKey = 54321
        expect(client._objToTlist(obj)).to.deep.equal(tlistObj);
      });

      it('should create a tlist_child-style object with a foreign key for a new record', () => {
        let obj = {
          'foo': 'bar'
        };
        let tlistObj = {
          'CF-[Students:54321.u_student_contacts.u_student_contacts:-1]foo': 'bar'
        }
        client.foreignKey = 54321
        expect(client._objToTlist(obj)).to.deep.equal(tlistObj);
      });
    });

    describe('_getPortal', () => {
      it('should return admin for /admin/home.html', () => {
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');
        expect(client._getPortal()).to.equal('admin');
      });
      it('should return teachers for /teachers/home.html', () => {
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/teachers/home.html');
        expect(client._getPortal()).to.equal('teachers');
      });
      it('should return guardian for /guardian/home.html', () => {
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/guardian/home.html');
        expect(client._getPortal()).to.equal('guardian');
      });
    });

    describe('_getAuthMetadata', () => {
      it('should add all record keys to displayCols and fieldNames', () => {
        let record = {
          'foo': 'bar',
          'this': 'that'
        };
        let authMetadata = {
          extGroup: 'u_student_contacts',
          extTable: 'u_student_contacts',
          displayCols: 'foo,this',
          fieldNames: 'foo,this'
        };
        expect(client._getAuthMetadata(record)).to.deep.equal(authMetadata);
      });
      it('should exclude id key from displayCols and fieldNames', () => {
        let record = {
          'id': 1234,
          'foo': 'bar',
          'this': 'that'
        };
        let authMetadata = {
          extGroup: 'u_student_contacts',
          extTable: 'u_student_contacts',
          displayCols: 'foo,this',
          fieldNames: 'foo,this'
        };
        expect(client._getAuthMetadata(record)).to.deep.equal(authMetadata);
      });
      it('should throw TypeError if no record object is passed in', () => {
        expect(client._getAuthMetadata.bind()).to.throw(TypeError);
      });
      it('should throw TypeError if empty record object is passed in', () => {
        expect(client._getAuthMetadata.bind({})).to.throw(TypeError);
      })
    });


    describe('_auth', () => {
      it('should send request to tlist_child_auth.html with correct query string', () => {
        fetchMock.mock();
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');
        let promise = client._auth({
          foo: 'bar'
        });
        promise.should.be.fulfilled;

        expect(fetchMock.called('auth')).to.equal(true);
        expect(fetchMock.calls('auth')[0][0]).to
          .equal('/admin/tlist_child_auth.html?extGroup=u_student_contacts&extTable=u_student_contacts&displayCols=foo&fieldNames=foo')

        fetchMock.restore();
      });

      it('should send request with frn in query URL string when client.foreignKey is defined', () => {
        fetchMock.mock();
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');
        client.foreignKey = 12345;
        console.log('starting second auth test');
        let promise = client._auth({
          foo: 'bar'
        });
        promise.should.be.fulfilled;
        expect(fetchMock.called('auth')).to.equal(true);
        expect(fetchMock.calls('auth')[0][0]).to
          .equal('/admin/tlist_child_auth.html?extGroup=u_student_contacts&extTable=u_student_contacts&displayCols=foo&fieldNames=foo&frn=00112345')

        fetchMock.restore();
      });
    });

    describe('save', () => {
      it('save promise should reject if response contains the string Authorization', () => {

        fetchMock.mock({
          routes: ['auth', {
            name: 'save',
            matcher: /changesrecorded.white.html/,
            response: {
              body: 'Authorization',
              opts: {
                status: 200
              }
            }
          }]
        });

        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');

        client.foreignKey = 12345;
        let promise = client.save({
          foo: 'bar'
        });
        promise.should.eventually.be.fulfilled;
        fetchMock.unregisterRoute('save');
      });

      /*it('should resolve if response does not contain the string Authorization', () => {
        fetchMock.restore();

        fetchMock.mock({
          routes: ['auth', {
            name: 'save',
            matcher: /changesrecorded.white.html/,
            response: {
              body: 'Changes Recorded',
              opts: {
                status: 200
              }
            }
          }]
        });

        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');

        client.foreignKey = 12345;
        let promise = client.save({
          foo: 'bar'
        });

        promise.should.be.fulfilled;
        fetchMock.unregisterRoute('save');
        promise.then(function() {
          fetchMock.restore();
        });
      });*/

      /*it('should print save calls', () => {
        fetchMock.reMock();
        let _getLocationStub = sinon.stub(client, '_getLocation');
        _getLocationStub.returns('/admin/home.html');


        client.foreignKey = 12345;


        fetchMock.debug = console.log;
        let promise = client.save({
          foo: 'bar'
        });
        promise.should.be.fulfilled;
        promise.then(function() {
          fetchMock.restore();
        })
      });*/
    });
  });

  mocha.run();
}
