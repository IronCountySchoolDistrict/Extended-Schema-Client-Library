module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            compile: {
                options: {
                    name: 'main',
                    baseUrl: "src/js",
                    mainConfigFile: "src/js/loader.js",
                    out: "src/build/escl.js",
                    optimize: "none"
                }
            }
        }
    });

   
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.registerTask('default', ['requirejs']);

};