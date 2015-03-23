module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            compile: {
                options: {
                    name: "escl",
                    baseUrl: "escl",
                    mainConfigFile: "escl/loader.js",
                    out: "build/escl.js",
                    optimize: "none"
                }
            }
        }
    });

   
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.registerTask('default', ['requirejs']);

};