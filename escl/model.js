require(['backbone'], function(Backbone) {
    var NotModel = Backbone.Model.extend({
        urlRoot: '/admin/not.html',
        defaults: {
            id: null,
            message: ""
        },
        sync: function(method, model, options) {
            options || (options = {});
            options.url = 'https://ps.irondistrict.org/ws/schema/table/U_NOTIFICATIONS/' + this.id + '?projection=*';

            // Use the default Backbone sync function with custom url
            return Backbone.sync.apply(this, arguments);
        },
        parse: function(response, options) {
            var obj = {};

            obj.id = response.id;
            _.each(Object.keys(response.tables.u_notifications), function(elem, index) {
                obj[elem] = response.tables.u_notifications[elem];
            });
            return obj;
        }
    });
    var not = new NotModel({
        id: 180269
    });

    not.fetch().then(function() {
        console.log(not.get('message'));
    });
});