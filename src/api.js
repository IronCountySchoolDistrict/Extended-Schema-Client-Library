/*global define, Promise, XMLHttpRequest*/

/**
 * Implements the PowerSchool API client functions, and contains some helper functions related to using the API
 */
define(function () {
    'use strict';
    return {

        /**
         * Creates an object that will convert to a JSON string the PUT resource accepts
         * See api-developer-guide-1.5.0/data-access/basic-read-and-write/resources.html#get_schema_resource_by_id
         * for JSON formats for UPDATE and INSERT operations
         * @param object {object}
         * @param tableName {string}
         */
        objectToApiFormat: function (object, tableName) {
            var apiObject = {
                tables: {}
            };

            // Add PUT properties to apiObject
            if (object.id !== undefined) {
                apiObject.id = object.id;
                apiObject.name = tableName;
            }

            apiObject.tables[tableName] = object;
            return apiObject;
        },

        /**
         *
         * @param data {Object}
         * @param tableName {String}
         * @param recordId {Number|String} ID of database record
         * @returns {Promise}
         */
        put: function (data, tableName, recordId) {
            var apiObject = this.objectToApiFormat(data, tableName);
            return new Promise(function (resolve, reject) {
                var url = '/ws/schema/table/' + tableName + '/' + recordId;
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = reject;
                xhr.open('PUT', url);
                xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
                xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
                xhr.send(JSON.stringify(apiObject));
            });
        },

        /**
         *
         * @param data
         * @param tableName
         * @returns {Promise}
         */
        post: function (data, tableName) {
            var apiObject = this.objectToApiFormat(data, tableName);
            return new Promise(function (resolve, reject) {
                var url = '/ws/schema/table/' + tableName;
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = reject;
                xhr.open('POST', url);
                xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
                xhr.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
                xhr.send(JSON.stringify(apiObject));
            });
        }
    };
});