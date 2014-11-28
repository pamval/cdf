/*!
 * Copyright 2002 - 2014 Webdetails, a Pentaho company.  All rights reserved.
 *
 * This software was developed by Webdetails and is provided under the terms
 * of the Mozilla Public License, Version 2.0, or any later version. You may not use
 * this file except in compliance with the license. If you need a copy of the license,
 * please go to  http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
 *
 * Software distributed under the Mozilla Public License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or  implied. Please refer to
 * the license for the specific language governing your rights and limitations.
 */


define(['../dashboard/Dashboard', '../Logger'],
    function (Dashboards, Logger) {
    
    var componentTypes = {
         Dummy : {
         
               name: "dummy",
               label: "Dummy",
               implementation: function (options) {
                    this.preExecution = function () {
                        console.log('preExecution Mixin 1');
                        this.preExecAppender += "MR1";
                    };

                    this.preChange = function () {
                        console.log('preChange Mixin 1');
                        this.preChangeAppender += "MR1";
                    };
                    
                                        
                    this.postExecution = function () {
                        console.log("PostExecution Mixin 1- my component name is " + this.name);
                        this.postExecAppender += "MR1";
                    };    
                    return this;
                }
                
        }
    };


    return componentTypes;
});