/*global define, Promise, XMLHttpRequest*/

/**
 * Implements behavior that duplicates the behavior of tlist_child/tlist_standalone-based forms.
 */
define(function () {
    'use strict';
    return {

        /**
         * Send the precursor request that enables the real POST request to be sent without PowerSchool returning an Authorization error.
         * @param enablePageUrl {string}
         * @param record {record}
         */
        enableRequest: function (enablePageUrl, record) {
            return new Promise(function (resolve, reject) {
                var url = enablePageUrl + this.encodeExtSchemaAsParam(record);
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = reject;
                xhr.open('GET', url);
                xhr.send();
            });
        },

        /**
         *
         * @param record {object}
         * @returns {string}
         */
        encodeExtSchemaAsParam: function (record) {
            var recordCols = Object.keys(record.data).join(',');
            return 'coreTable=' + record.coreTable + '&extGroup=' + record.extGroup + '&extTable=' + record.extTable + '&fieldname=' + recordCols + '&dispCols=' + recordCols;
        },

        /**
         *
         * @param object {object} - data object with keys that match the column names in the db
         * @param extGroup - extension group
         * @param extTable - extension table
         * @param [foreignKey] - id of the parent record in coreTable db table. If undefined, assume we're working with an independent record, so set foreign key to 0.
         * @param [coreTable] - parent table. If undefined, assume this is an independent table.
         * @param [recordId] - if a record is getting updated, this is the id of the row to be updated. If undefined, assume a new record is getting inserted and set to -1.
         * @param [isInteger] - field is of Integer type
         */
        objectToTlistFormat: function (object, extGroup, extTable, foreignKey, coreTable, recordId, isInteger) {
            // foreignKey and coreTable are co-dependent params -- if one is passed in, the other is required
            if (foreignKey !== undefined && coreTable === undefined) {
                throw new Error('coreTable parameter is required if foreignKey is given!');
            }

            // This exception probably won't be triggered because of the ordering of params, but check just in case.
            if (coreTable !== undefined && foreignKey === undefined) {
                throw new Error('coreTable parameter is required if foreignKey is given!');
            }

            var tlistChildObject = {};
            for (var key in object) {
                // Make sure the key is actually in object, not a key from its prototype
                if (object.hasOwnProperty(key)) {
                    var tlistChildFieldName = 'CF-[';
                    if (coreTable !== undefined) {
                        tlistChildFieldName += coreTable;
                    }
                    tlistChildFieldName += ':';

                    if (foreignKey !== undefined) {
                        tlistChildFieldName += foreignKey;
                    } else {
                        tlistChildFieldName += '0';
                    }

                    tlistChildFieldName += '.';

                    tlistChildFieldName += extGroup + '.' + extTable + ':';

                    if (recordId !== undefined) {
                        tlistChildFieldName += recordId;
                    } else {
                        tlistChildFieldName += '-1';
                    }
                    tlistChildFieldName += ']' + key;
                    if (isInteger) {
                        tlistChildFieldName += '$format=numeric';
                    }
                    tlistChildObject[tlistChildFieldName] = object[key];
                }
            }
            return tlistChildObject;
        }
    };
});