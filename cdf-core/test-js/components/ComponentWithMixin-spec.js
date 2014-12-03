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

define(["cdf/Dashboard", "cdf/components/TextComponent", "cdf/AddIn"],
  function(Dashboard, TextComponent, AddIn) {

  /**
   * ## The Component with mixins
   */
  describe("Component with mixin tests #", function() {

    var dashboard = new Dashboard();

    dashboard.init();
      dashboard.registerAddIn("Base", "mixin", new AddIn({
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
           * Implementation function for the add-in
           * Should return a function that will be executed with the component as this, so that the component
           * can be extended with whatever new functionality people want to use.
           *
           * @param tgt - Target DOM element - not used for this type of add-in
           * @param st - Context for the add-in - not used for this type of add-in
           * @param options - Configuration options for the component add-in
           */
          implementation: function (tgt, st, opt) {
              return function () {
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
      }));

    dashboard.registerAddIn("Base", "mixin", new AddIn({
        name: "dummy1",
        label: "Dummy 1",
        implementation: function(tgt, st, options) {
            return function () {
                this.preExecution = function () {
                    console.log("preExecution Mixin 2 - " + options.test);
                    this.preExecAppender += "M2";
                };

                this.postChange = function () {
                    console.log("postChange mixin 2");
                    this.postChangeAppender += "M2";
                };
            };
        }
    }));


      dashboard.registerAddIn("Base", "mixin", new AddIn({
          name: "dummy2",
          label: "Dummy 2",
          implementation: function(tgt, st, options) {
              return function () {
                  this.preExecution = function () {
                      console.log("preExecution Mixin 2 - " + options.test);
                      throw "Mixin Error";
                  };

                  this.postChange = function () {
                      console.log("postChange mixin 2");
                      this.postChangeAppender += "M2";
                  };
              }
          }
      }));

    var textComponent = new TextComponent(dashboard, {
      name: "textComponent",
      type: "textComponent",
      
      //For testing purposes
      preExecAppender : "",
      postExecAppender : "",
      preChangeAppender : "",
      postChangeAppender : "",
      
      
      preExecution: function () {
        this.preExecAppender += "C";
      },
      postExecution: function () {
        this.postExecAppender += "C";
      },
      preChange: function () {
        console.log("component preChange called");
        this.preChangeAppender += "C";
      },
      postChange: function () {
        console.log("component postChange called");
        this.postChangeAppender += "C";
      },
      
      getValue: function () {
        return "X";
      },
      
      mixins: [["dummy", 
                {}
                ],
                ["dummy1",
                {test : "Teste"}
                ]
              ],
      htmlObject: 'textComponent',
      listeners:[],
      expression: function() {
        return "My text generated in " + new Date();
      },
      executeAtStart: true
    });

    dashboard.addComponent(textComponent);


    var textComponent2 = new TextComponent(dashboard, {
      name: "textComponent2",
      type: "textComponent",
      
      //For testing purposes
      preExecAppender : "",
      postExecAppender : "",
      preChangeAppender : "",
      postChangeAppender : "",
      
      
      preExecution: function () {
        this.preExecAppender += "C";
      },
      postExecution: function () {
        this.postExecAppender += "C";
      },
      preChange: function () {
        console.log("component preChange called");
        this.preChangeAppender += "C";
      },
      postChange: function () {
        console.log("component postChange called");
        this.postChangeAppender += "C";
      },
      
      mixins: [["dummy2",
                {test : "Teste"}
                ],
                ["dummy", 
                {}
                ],                
              ],
      htmlObject: 'textComponent2',
      listeners:[],
      expression: function() {
        return "My text generated in " + new Date();
      },
      executeAtStart: true
    });


    dashboard.addComponent(textComponent2);

    beforeEach(function () {
        textComponent.preExecAppender = "";
        textComponent.postExecAppender = "";
        textComponent.preChangeAppender = "";    
        textComponent.postChangeAppender = "";        
        textComponent2.preExecAppender = "";        
        textComponent2.postExecAppender = "";                
    });


    it("Pre Executions are triggered in the right order", function(done) {
      spyOn(textComponent, 'update').and.callThrough();      
      dashboard.update(textComponent);
      setTimeout( function () {
                            expect(textComponent.update).toHaveBeenCalled();
                            expect(textComponent.preExecAppender).toBe("CMR1M2");
                            done();
                          },100);
      
      
    });

    it("One PostExecution is triggered", function(done) {
      dashboard.update(textComponent);      
      setTimeout( function() {
                            expect(textComponent.postExecAppender).toBe("CMR1");                            
                            done();
                          },
                100);       
    });
    
    
    it("One PreChange from Mixin1 and one postchange from mixin2 is triggered", function(done) {
//      dashboard.update(textComponent);      
      dashboard.processChange("textComponent");
      setTimeout( function() {
                            expect(textComponent.preChangeAppender).toBe("CMR1");                                                        
                            expect(textComponent.postChangeAppender).toBe("CM2");                            
                            done();
                          },
                100);       
    });

    it("Execution is not halted if one mixin throws an error", function(done) {
      dashboard.update(textComponent2);      
      setTimeout( function() {
                            expect(textComponent2.preExecAppender).toBe("CMR1");
                            expect(textComponent2.postExecAppender).toBe("CMR1");                            
                            done();
                          },
                100);       
    });

    
    
    
  });
});
