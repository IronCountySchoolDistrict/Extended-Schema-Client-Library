/*global define*/

define(function () {
    'use strict';
    return {

        /**
         * An object to represent a record in an extended schema table. It may or may not exist yet in the database.
         * @param data {object}
         * @param extGroup {string}
         * @param extTable {string}
         * @param coreTable {string}
         */
        record: function (data, extGroup, extTable, coreTable) {
            this.data = data;
            this.extGroup = extGroup;
            this.extTable = extTable;
            this.coreTable = coreTable;
        }
    };
});