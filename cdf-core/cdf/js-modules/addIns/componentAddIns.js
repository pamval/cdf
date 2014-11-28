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
            defaults: {}, //Default options

            /**
             * Initialization function for the component add-in (Optional)
             *
             */            
            init: function () {
            
               
            },
            
            /**
             * Validation function (for future use)
             *
             * @returns returns an array of component names where this add-in can be used 
             *  or null if applicable to all
             */            
            applicableComponents: function () {
                return null;            
            },
            
            
            /**
             * Implementation function for the add-in
             * The function will be executed with the component as this, so that the component
             * can be extended with whatever new functionality people want to use.
             * 
             * @param options - Configuration options for the component add-in
             */
            mixinImplementation: function (options) {
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
            },
            
            
            /**
             * Optionally, the comopnent add-in can also expose an add-in of a different type.
             * This can be useful for exposing, for instance, a col type that should be used along 
             * with a particular component add-in.
             *
             */
             addInType: "Table",
             addInSubType: "ColType",
             
             implementation: function(tgt, st, opt){
                var $tgt = $(tgt),
                $container = $("<div>");
                $tgt.empty().append($container);
                $container.text(st.value).addClass("clippedText").attr("title",opt.showTooltip ? st.value : "");
                $container.css(opt.style);
                if(opt.useTipsy) {
                  $container.tipsy({
                    gravity: 's', 
                    html:false
                  });
            }             
             
             
        }
    };


    return componentTypes;
});