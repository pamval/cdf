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

define(["../lib/Base", "../lib/jquery", "../lib/underscore", "../lib/backbone", "../Logger", "../dashboard/Utils"],
  function(Base, $, _, Backbone, Logger, Utils) {

  var O_hasOwn = Object.prototype.hasOwnProperty,
      O_getOwn = function(p, dv) {
          return O_hasOwn.call(this, p) ? this[p] : dv;
      },
      undefined; // [DCL] Just because I'm sure some of you would complain!

  var BaseComponent = Base.extend(Backbone.Events).extend({

    //type : "unknown",

    visible: true,
    isManaged: true,
    timerStart: 0,
    timerSplit: 0,
    elapsedSinceSplit: -1,
    elapsedSinceStart: -1,
    logColor: undefined,
    //valueAsId:
    //valuesArray:
    //autoFocus: false,

    /**
     * Creates an instance of BaseComponent
     *
     * @constructor
     * @alias module:constructor
     */
    constructor: function(dashboard, properties) {
      this.extend(properties);
      this.dashboard = dashboard;

      if(this.mixins && this.mixins.length > 0) this._addMixins(this.mixins);
    },

    /**
     * Adds the specified mixin definitions to this instance.
     *
     * This method is called only once per instance, from its constructor.
     *
     * @param {Array.<Array>} mixins The array of mixin definitions.
     *   Each definition is an array of two positions.
     *   The first is the name of the mixin.
     *   The second is the mixin's configuration object.
     *
     * @private
     */
    _addMixins: function(mixins) {
        // Sample structure of the methodInfoByName map
        // <name>: { // @type MethodInfo
        //     name: extPointName,
        //     main: mainMethod,
        //     mixins: [
        //        {<extPointName>: extPointMethod}
        //     ]
        // }
        var methodInfoByName = {},
            methodInfos = [],
            i = -1,
            L = mixins.length;

        // Index all mixins' methods into methodInfos/methodInfosByName.
        while(++i < L) addMixin.call(this, mixins[i]);

        // Coordinate methodInfos with more than one implementation.
        i = -1; L = methodInfos.length;
        while(++i < L) this._setupMixinMethod(methodInfos[i]);

        function addMixin(mixinDef) {
            var addInName = mixinDef[0],
                addInOpts = mixinDef[1],
                impl = this.getAddIn("mixin", addInName)
                        .call(/*target:*/null, /*state:*/this, /*options:*/addInOpts),
                mixin = {};

            // Install the mixin on an auxiliary object.
            impl.call(mixin);

            // For every own property defined in mixin,
            // create a methodInfo object in methodInfos.
            for(var extPointName in mixin) {
                if(O_hasOwn.call(mixin, extPointName)) {
                    var extPointValue = mixin[extPointName];
                    if(!_.isFunction(extPointValue)) {
                        // Smash (not even checking if it is a function locally...)
                        this[extPointName] = extPointValue;
                    } else {
                        var methodInfo = O_getOwn.call(methodInfoByName, extPointName);
                        if(!methodInfo) {
                            methodInfo = methodInfoByName[extPointName] = {
                                name:   extPointName,
                                main:   this[extPointName] || null,
                                mixins: []
                            };
                            methodInfos.push(methodInfo);
                        }

                        methodInfo.mixins.push({
                            name:   addInName,    // Debug info
                            method: extPointValue
                        });
                    }
                }
            }
        }
    },

    /**
     * Sets up a mixed-in method in this instance given a method information object.
     *
     * @param {object} methodInfo The method information object.
     * @param {string} methodInfo.name The name of the method to create.
     * @param {function|null} methodInfo.main The main method or <tt>null</tt>, if none.
     *   The main method is the method that the instance receives from its class prototype,
     *   and is usually called in a priviledged manner, w.r.t. the other mixed in methods.
     * @param {Array.<Object>} methodInfo.mixins An array of at least one mixin information object.
     *   Each object has a property <i>name</i>, with the name of the mixin, for debugging purposes,
     *   and a property <i>method</i>, with the mixin method.
     */
     _setupMixinMethod: function(methodInfo) {
        var name   = methodInfo.name,
            main   = methodInfo.main,
            mixins = methodInfo.mixins,
            M      = mixins.length,
            builder;

        if(!main && M === 1) {
            // This is an own method of a single mixin.
            // Just copy it; no coordination is necessary.
            this[name] = mixins[0].method;
        } else {
            // Coordination is necessary.
            builder = this._getMixinMethodBuilder(name);
            this[name] = builder.call(this, name, main, mixins, M);
            this[name].displayName = "Component Coordination Method " + name;
        }
    },

    /**
     * Obtains the coordination method-builder method that should be used to
     * build/create a given method name.
     *
     * The default implementation looks up a method named
     * <tt>"_createMixinMethod_" + name</tt> located in this instance.
     * If one is not defined,
     * the default {@link BaseComponent#_createMixinMethodAfterNormal} is returned.
     *
     * @param {string} name The name of the method to coordinate.
     * @return {function} The builder method.
     * It will be called on the <tt>this</tt> value.
     *
     * @protected
     */
    _getMixinMethodBuilder: function(name) {
        return this['_createMixinMethod_' + name] ||
               this._createMixinMethodAfterNormal;
    },

    /**
     * Creates a normal <i>after</i> mixin coordination method,
     * given the method name, main method and mixins.
     *
     * The coordination method first calls the <i>main</i> method, if one exists.
     * Then, each mixin method is called in the order in which the mixin was added to this object.
     * If one mixin method throws an error, execution resumes by calling the next mixin method.
     * The returned result is that of the last mixin method.
     * The only case in which the main method result is returned is when all mixin methods fail.
     *
     * @param {string} name The name of the method being coordinated.
     * @param {function|null} main The main method, if any, or <tt>null</tt>.
     * @param {Array.<Object>} mixins An array of at least one mixin information object.
     *   Each object has a property <i>name</i>, with the name of the mixin, for debugging purposes,
     *   and a property <i>method</i>, with the mixin method.
     * @param {number} M The number of elements in argument <i>mixins</i>. At least one.
     *
     * @return {function} A coordination method.
     * @private
     */
    _createMixinMethodAfterNormal: function(name, main, mixins, M) {
        return function normalMethod() {
            var res, m = -1;
            if(main) res = main.apply(this, arguments);

            while(++m < M) {
                try {
                    res = mixins[m].method.apply(this, arguments);
                } catch(ex) {
                    Logger.error(
                        "Error occurred while calling component addin " + mixins[m].name +
                        " in component " + this.name +
                        " for phase "    + name + ": " + ex);
                }
            }

            return res;
        };
    },

    /**
     * Coordination method builder for the <i>preExecution</i> method.
     *
     * Provides the usual interpretation given to the result value of
     * a <i>preExecution</i> method to each called method.
     *
     * The first method to return a non-<tt>undefined</tt>, yet <i>falsy</i> value
     * cancels the component's execution and prevents other methods from being called.
     *
     * Apart from this special handling,
     * this method behaves similarly to {@link BaseComponent#_createMixinMethodAfterNormal}.
     *
     * @param {string} name The name of the method being coordinated.
     * @param {function|null} main The main method, if any, or <tt>null</tt>.
     * @param {Array.<Object>} mixins An array of at least one mixin information object.
     *   Each object has a property <i>name</i>, with the name of the mixin, for debugging purposes,
     *   and a property <i>method</i>, with the mixin method.
     * @param {number} M The number of elements in argument <i>mixins</i>. At least one.
     *
     * @return {function} A coordination method.
     * @private
     */
    _createMixinMethod_preExecution: function(name, main, mixins, M) {
        return function preExecMethod() {
            var res, m = -1;
            if(main) {
                res = main.apply(this, arguments);
                if(res !== undefined && !res) return false;
            }

            while(++m < M) {
                try {
                    res = mixins[m].method.apply(this, arguments);
                    if(res !== undefined && !res) return false;
                } catch(ex) {
                    Logger.error(
                        "Error occurred while calling component addin " + mixins[m].name +
                        " in component " + this.name +
                        " for phase "    + name + ": " + ex);
                }
            }

            return true;
        };
    },

    // TODO: Should postExecution be coordinated in before+reverse?
    // i.e. last mixin first, ..., first mixin, main method last.

    placeholder: function(selector) {
      var ho = this.htmlObject;
      return ho
        ? $("#" + ho + (selector ? (" " + selector) : ""))
        : $();
    },

    focus: function() {
      try {
        this
          .placeholder("*:first")
          .focus();
      } catch(ex) { /* Swallow, maybe hidden. */ }
    },

    _doAutoFocus: function() {
      if(this.autoFocus) {
        delete this.autoFocus;
        this.focus();
      }
    },

    clear : function() {
      this.placeholder().empty();
    },

    copyEvents: function(target,events) {
      _.each(events,function(evt, evtName){
        var e = evt,
            tail = evt.tail;
        while((e = e.next) !== tail) {
          target.on(evtName,e.callback,e.context);
        }
      })
    },

    clone: function(parameterRemap,componentRemap,htmlRemap) {
      var that, dashboard, callbacks;
      /*
       * `dashboard` points back to this component, so we need to remove it from
       * the original component before cloning, lest we enter an infinite loop.
       * `_events` contains the event bindings for the Backbone Event mixin
       * and may also point back to the dashboard. We want to clone that as well,
       * but have to be careful about it.
       */
      dashboard = this.dashboard;
      callbacks = this._events;
      delete this.dashboard;
      delete this._events;
      that = $.extend(true,{},this);
      that.dashboard = this.dashboard = dashboard;
      this._events = callbacks;
      this.copyEvents(that,callbacks);

      if(that.parameters) {
        that.parameters = that.parameters.map(function(param){
          if (param[1] in parameterRemap) {
            return [param[0],parameterRemap[param[1]]];
          } else {
            return param;
          }
        });
      }
      if(that.components) {
        that.components = that.components.map(function(comp){
          if (comp in componentRemap) {
            return componentRemap[comp];
          } else {
            return comp;
          }
        });
      }
      that.htmlObject = !that.htmlObject? undefined : htmlRemap[that.htmlObject];
      if(that.listeners) {
        that.listeners = that.listeners.map(function(param){
          if (param in parameterRemap) {
            return parameterRemap[param];
          } else {
            return param;
          }
        });
      }
      if(that.parameter && that.parameter in parameterRemap) {
        that.parameter = parameterRemap[that.parameter];
      }
      return that;
    },

    getAddIn: function(subType, addInName) {
      // [DCL] Since when can `type` be a function?
      var type = typeof this.type == "function" ? this.type() : this.type;

      return this.dashboard.getAddIn(type,   subType, addInName) ||
             this.dashboard.getAddIn("Base", subType, addInName);
    },

    hasAddIn: function(subType, addInName) {
      var type = typeof this.type == "function" ? this.type() : this.type;

      return this.dashboard.hasAddIn(type,   subType, addInName) ||
             this.dashboard.hasAddIn("Base", subType, addInName);
    },

    setAddInOptions: function(subType, addIn, options) {
        var addInOpts   = this.addInOptions  || (this.addInOptions  = {}),
            subTypeOpts = addInOpts[subType] || (addInOpts[subType] = {});

        subTypeOpts[addIn] = options;
    },

    getAddInOptions: function(subType, addIn) {
        var addInOpts, subTypeOpts;
        return ((addInOpts   = this.addInOptions) &&
                (subTypeOpts = addInOpts[subType]) &&
                subTypeOpts[addIn]) || {};
    },

    setAddInDefaults: function(subType, addIn, defaults) {
        Logger.log("BaseComponent.setAddInDefaults was removed. You should call setAddInOptions or dashboard.setAddInDefaults");
    },

    getValuesArray : function() {
      var jXML;
      if(typeof(this.valuesArray) == 'undefined' || this.valuesArray.length == 0) {
        if(typeof(this.queryDefinition) != 'undefined') {

          var vid = (this.queryDefinition.queryType == "sql")?"sql":"none";
          if((this.queryDefinition.queryType == "mdx") && (!this.valueAsId)) {
            vid = "mdx";
          } else if (this.queryDefinition.dataAccessId !== undefined && !this.valueAsId) {
            vid = 'cda';
          }
          QueryComponent.makeQuery(this);
          var myArray = new Array();
          for(p in this.result) if(this.result.hasOwnProperty(p)) {
            switch(vid){
              case "sql":
                myArray.push([this.result[p][0],this.result[p][1]]);
                break;
              case "mdx":
                myArray.push([this.result[p][1],this.result[p][0]]);
                break;
              case 'cda':
                myArray.push([this.result[p][0],this.result[p][1]]);
                break;
              default:
                myArray.push([this.result[p][0],this.result[p][0]]);
                break;
            }
          }
          return myArray;
        } else {

          //go through parameter array and update values
          var p = new Array(this.parameters?this.parameters.length:0);
          for(var i= 0, len = p.length; i < len; i++) {
            var key = this.parameters[i][0];
            var value = this.parameters[i][1] == "" || this.parameters[i][1] == "NIL" ? this.parameters[i][2] : this.dashboard.getParameterValue(this.parameters[i][1]);
            p[i] = [key,value];
          }

          //execute the xaction to populate the selector
          var myself=this;
          if(this.url) {
            var arr = {};
            $.each(p,function(i,val){
              arr[val[0]]=val[1];
            });
            jXML = this.dashboard.parseXActionResult(myself, this.dashboard.urlAction(this.url, arr));
          } else {
            jXML = this.dashboard.callPentahoAction(myself, this.solution, this.path, this.action, p,null);
          }
          //transform the result int a javascript array
          var myArray = this.parseArray(jXML, false);
          return myArray;
        }
      } else {
        return this.valuesArray;
      }
    },

    parseArray : function(jData,includeHeader) {

      if(jData === null) {
        return []; //we got an error...
      }

      if($(jData).find("CdaExport").size() > 0) {
        return this.parseArrayCda(jData, includeHeader);
      }

      var myArray = new Array();

      var jHeaders = $(jData).find("COLUMN-HDR-ITEM");
      if(includeHeader && jHeaders.size() > 0) {
        var _a = new Array();
        jHeaders.each(function(){
          _a.push($(this).text());
        });
        myArray.push(_a);
      }

      var jDetails = $(jData).find("DATA-ROW");
      jDetails.each(function(){
        var _a = new Array();
        $(this).children("DATA-ITEM").each(function() {
          _a.push($(this).text());
        });
        myArray.push(_a);
      });

      return myArray;

    },

    parseArrayCda : function(jData,includeHeader) {
      //ToDo: refactor with parseArray?..use as parseArray?..
      var myArray = new Array();

      var jHeaders = $(jData).find("ColumnMetaData");
      if(jHeaders.size() > 0){
        if(includeHeader) {//get column names
          var _a = new Array();
          jHeaders.each(function() {
            _a.push($(this).attr("name"));
          });
          myArray.push(_a);
        }
      }

      //get contents
      var jDetails = $(jData).find("Row");
      jDetails.each(function() {
        var _a = new Array();
        $(this).children("Col").each(function() {
          _a.push($(this).text());
        });
        myArray.push(_a);
      });

      return myArray;

    },

    startTimer: function(){

      this.timerStart = new Date();
      this.timerSplit = new Date();

    },

    splitTimer: function() {

      // Sanity check, in case this component doesn't follow the correct workflow
      if(this.elapsedSinceStart === -1 || this.elapsedSinceSplit === -1) {
        this.startTimer();
      }

      var now = new Date();

      this.elapsedSinceStart = now.getTime() - this.timerStart.getTime();
      this.elapsedSinceSplit = now.getTime() - this.timerSplit.getTime();

      this.timerSplit = now;
      return this.getTimerInfo();
    },

    formatTimeDisplay: function(t) {
      return Math.log(t)/Math.log(10)>=3?Math.round(t/100)/10+"s":t+"ms";
    },

    getTimerInfo: function() {

        return {
          timerStart: this.timerStart,
          timerSplit: this.timerSplit,
          elapsedSinceStart: this.elapsedSinceStart,
          elapsedSinceStartDesc: this.formatTimeDisplay(this.elapsedSinceStart),
          elapsedSinceSplit: this.elapsedSinceSplit,
          elapsedSinceSplitDesc: this.formatTimeDisplay(this.elapsedSinceSplit)
        }

    },

    /*
     * This method assigns and returns a unique and somewhat randomish color for
     * this log. The goal is to be able to track cdf lifecycle more easily in
     * the console logs. We're returning a Hue value between 0 and 360, a range between 0
     * and 75 for saturation and between 45 and 80 for value
     *
     */

    getLogColor: function() {

      if(this.logColor) {
        return this.logColor;
      } else {
        // generate a unique,
        var hashCode = function(str){
          var hash = 0;
          if(str.length == 0) {
            return hash;
          }
          for(i = 0; i < str.length; i++) {
            var chr = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+chr;
            hash = hash & hash; // Convert to 32bit integer
          }
          return hash;
        }

        var hash = hashCode(this.name).toString();
        var hueSeed = hash.substr(hash.length-6,2) || 0;
        var saturationSeed = hash.substr(hash.length-2,2) || 0;
        var valueSeed = hash.substr(hash.length-4,2) || 0;

        this.logColor = Utils.hsvToRgb(
          360 / 100 * hueSeed,
          75 / 100 * saturationSeed,
          45 + (80 - 45) / 100 * valueSeed);

        return this.logColor;

      }
    }
  });

  return BaseComponent;

});
