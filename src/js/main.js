require(['api', 'tlist', 'record'], function(api, tlist, record) {
    return {
        saveFormTlist: function (form) {
            var formArray = form.serializeArray();
            var formData = {};
            formArray.forEach(function (elem) {
                var name = elem.name;
                formData[name] = elem.value;
            });
            var record = new record(formData, )
        }
    }
});