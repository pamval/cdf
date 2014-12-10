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


define(['../Dashboard',
        '../Logger',
        '../AddIn',
        '../lib/jquery',
        '../lib/datatables',
        'css!./selectableTable'],
    function(Dashboard, Logger, AddIn, $) {

    Dashboard.registerGlobalAddIn("Base", "mixin", new AddIn({
        name:  "selectableTable",
        label: "Selectable Table",

        implementation: function(target, state, options) {
            return function() {

                this.selectableTable_addInSetting = function(
                    selectionListName,
                    selectAllParamName,
                    updateCountersEventName,
                    selectedCountParamName,
                    totalCountParamName,
                    selectableColIdx) {

                    var myself = this;

                    // Defaults for table render:
                    // - selectAll inactive
                    //		Dashboards.setParameter(selectAllParamName, false);
                    //
                    // - reset Total counts:
                    //		selectTable.resetTotalsCount(totalCountParamName);
                    //
                    // - reset Selected counts and clean selection list:
                    //		selectTable.clearSelection(selectionListName, selectAllParamName, selectedCountParamName);
                    //		Dashboards.fireChange(updateCountersEventName, $.now());

                    // Select item AddIn
                    var selectOpts = {
                        getSelectedList: function () {
                            return myself.dashboard.getParameterValue(selectionListName);
                        },
                        getSelectAllStatus: function () {
                            return myself.dashboard.getParameterValue(selectAllParamName);
                        },
                        buttons: [
                            {
                                id: "selectBtn",
                                cssClass: "selectBox",
                                selectedCssClass: "selected",
                                title: "",
                                action: function(v, state) {
                                    var dash = myself.dashboard,
                                        list = dash.getParameterValue(selectionListName),
                                        totSelectCount = dash.getParameterValue(selectedCountParamName),
                                        isSelectAllActive = dash.getParameterValue(selectAllParamName),
                                        pos = list.indexOf(v);

                                    if(pos === -1) {
                                        list.push(v);
                                        if(isSelectAllActive) totSelectCount -= 1; else totSelectCount += 1;
                                    } else {
                                        list.splice(pos, 1);
                                        if(isSelectAllActive) totSelectCount += 1; else totSelectCount -= 1;
                                    }

                                    $(state.target).find("#" + this.id).toggleClass("selected");

                                    myself.selectableTable_updateSelectAllOnPageStatus("selected", selectableColIdx);
                                    myself.selectableTable_updateSelectAllVisStatus(
                                            selectionListName,
                                            selectAllParamName,
                                            totalCountParamName);

                                    dash.setParameter(selectedCountParamName, totSelectCount);

                                    myself.selectableTable_checkAndProcessFullDataSelection(
                                            selectionListName,
                                            selectAllParamName,
                                            selectedCountParamName,
                                            totalCountParamName);

                                    dash.fireChange(updateCountersEventName, new Date().getTime());
                                }
                            }
                        ]
                    };
                    myself.setAddInOptions("colType", "selectableTable", selectOpts);
                };

                this.selectableTable_clearSelection = function(selectionListName, selectAllParamName, selectedCountParamName, totalCountParamName) {
                    this.dashboard.setParameter(selectionListName, []);
                    this.selectableTable_resetSelectedCounts(selectAllParamName, selectedCountParamName, totalCountParamName);
                };

                this.selectableTable_resetSelectedCounts = function(selectAllParamName, selectedCountParamName, totalCountParamName) {
                    var isSelectAllActive = this.dashboard.getParameterValue(selectAllParamName),
                        totalCount = this.dashboard.getParameterValue(totalCountParamName);
                    this.dashboard.setParameter(selectedCountParamName, (isSelectAllActive ? totalCount : 0));
                };

                this.selectableTable_resetTotalsCount = function(totalCountParamName) {
                    this.dashboard.setParameter(totalCountParamName, 0);
                };

                this.selectableTable_getColDataFromRowList = function(colIdx, $rowList) {
                    // Get Array of original dataTable data on specified column,
                    //	for a list of jQuery Trs:
                    return _.map($rowList, function(ele, idx) {
                            return this.selectableTable_getColDataFromTr(colIdx, ele);
                        }, this);
                };

                this.selectableTable_getColDataFromTr = function(colIdx, tr) {
                    // Get original dataTable data on specified column
                    //		 of specified DOM Tr on table:
                    var $table = $("#" + this.htmlObject).find("table"),
                        rowIdx = this.selectableTable_getDataTableRowIdxFromTr(tr);
                    return $table.dataTable().fnGetData(rowIdx)[colIdx];
                };

                this.selectableTable_getDataTableRowIdxFromTr = function(tr) {
                    // Get DataTable row index of specified DOM Tr on table:
                    return $("#" + this.htmlObject).find("table").dataTable().fnGetPosition(tr);
                };
                // Data Tables Interface Layer: END


                this.selectableTable_getRowsOnPage = function() {
                    // Get list of jQuery Tr on table's visible page:
                    var $table = $("#" + this.htmlObject).find("table"),
                        $visTrList = $table.find("tbody").find("tr");
                    return $visTrList;
                };

                this.selectableTable_getSelectedRowsFromRowsList = function($rowsList, selectedCssClass, selectableColIdx) {
                    // Get list of jQuery Trs which are selected on larger jQuery Tr list:
                    var $activeBtns = $rowsList.find(".column" + selectableColIdx).find("." + selectedCssClass);
                    return $activeBtns.parents("tr");
                };

                this.selectableTable_getSelectedRowsOnPage = function (selectedCssClass, selectableColIdx) {
                    // Get selected jQuery Tr list on table's visible page:
                    var $rowsList = this.selectableTable_getRowsOnPage();
                    return this.selectableTable_getSelectedRowsFromRowsList($rowsList, selectedCssClass, selectableColIdx);
                };

                this.selectableTable_checkIfPageSelectionIsFull = function (selectedCssClass, selectableColIdx) {
                    return this.selectableTable_getRowsOnPage().length ===
                           this.selectableTable_getSelectedRowsOnPage(selectedCssClass, selectableColIdx).length;
                };

                this.selectableTable_updateSelectAllOnPageStatus = function (selectedCssClass, selectableColIdx) {
                    var $allOnPageBtnPh = $("#" + this.htmlObject).find(".selectAllOnPageBtnCont"),
                        isPageFullSelection = this.selectableTable_checkIfPageSelectionIsFull(selectedCssClass, selectableColIdx);

                    if(isPageFullSelection) {
                        $allOnPageBtnPh.addClass("active")
                    } else {
                        $allOnPageBtnPh.removeClass("active")
                    }
                };

                this.selectableTable_updateSelectAllVisStatus = function(selectionListName, selectAllParamName, totalCountParamName) {
                    var $allBtnPh = $("#" + this.htmlObject).find(".selectAllBtnCont"),
                        list = this.dashboard.getParameterValue(selectionListName),
                        selectAllStatus = this.dashboard.getParameterValue(selectAllParamName),
                        totalCount = this.dashboard.getParameterValue(totalCountParamName);

                    $allBtnPh
                        .removeClass("empty")
                        .removeClass("full")
                        .removeClass("mixed");

                    if((list.length === 0 && !selectAllStatus) ||
                       (list.length === totalCount && selectAllStatus)) {
                        $allBtnPh.addClass("empty")
                    } else if((list.length === 0 && selectAllStatus) ||
                              (list.length === totalCount && !selectAllStatus)) {
                        $allBtnPh.addClass("full");
                    } else {
                        $allBtnPh.addClass("mixed")
                    }
                };

                this.selectableTable_checkAndProcessFullDataSelection = function(selectionListName, selectAllParamName, selectedCountParamName, totalCountParamName) {
                    var selectionList = this.dashboard.getParameterValue(selectionListName),
                        totalCount = this.dashboard.getParameterValue(totalCountParamName),
                        originalSelectAlStatus = this.dashboard.getParameterValue(selectAllParamName);

                    // Check if end of the road was reached
                    if(selectionList.length === totalCount) {
                        // Toggle selectAll backstage status
                        this.dashboard.setParameter(selectAllParamName, !originalSelectAlStatus);

                        // Clean selection
                        this.selectableTable_clearSelection(selectionListName, selectAllParamName, selectedCountParamName, totalCountParamName);
                    }
                };

                // Selection control panel on table: START

                this.selectableTable_buildSelectionPanelOnTable = function(
                        selectAllParamName,
                        selectionListName,
                        updateCountersEventName,
                        selectedCountParamName,
                        totalCountParamName,
                        selectableColIdx) {

                    // build header selection control panels:
                    var $thead = $("#" + this.htmlObject).find("thead"),
                        $originalTr = $thead.find("tr"),
                        $selectAllTr = $("<tr/>")
                            .addClass("customTr")
                            .addClass("selectAll")
                            .appendTo($thead),
                        $selectAllOnPageTr = $("<tr/>")
                            .addClass("customTr")
                            .addClass("selectAllOnPage")
                            .appendTo($thead),
                        $selectAllBtnPh = $("<div/>")
                            .addClass("selectAllBtnCont")
                            .toggleClass("active", this.dashboard.getParameterValue(selectAllParamName)),
                        $selectAllOnPageBtnPh = $("<div/>")
                            .addClass("selectAllOnPageBtnCont");

                    $.each($originalTr.find("th"), function(idx, th) {
                        var $th = $(th),
                            cssClassAttr = $th.attr("class");

                        $selectAllTr.append(
                            $("<td/>")
                                .attr("class", cssClassAttr)
                                .removeClass("sorting"));

                        $selectAllOnPageTr.append(
                            $("<td/>")
                                .attr("class", cssClassAttr)
                                .removeClass("sorting"));
                    });

                    var $selectAllTds = $selectAllTr.find("td"),
                        $selectAllOnPageTds = $selectAllOnPageTr.find("td");

                    $($selectAllTds[0]).append($selectAllBtnPh.append($("<button/>")
                        .click(selectAllCallback)));

                    $($selectAllTds[1]).append(
                        $("<div/>")
                            .addClass("label")
                            .text("select all"));

                    $($selectAllOnPageTds[0]).append(
                        $selectAllOnPageBtnPh.append(
                            $("<button/>")
                                .click(selectAllOnPageCallback)));

                    $($selectAllOnPageTds[1]).append(
                        $("<div/>")
                            .addClass("label")
                            .text("select all on this page"));

                    // Define selectAll and selectAllOnPage callbacks (sharing variables on scope):
                    var myself = this;

                    function selectAllCallback() {
                        var $ph = $(this).parent(),
                            isSelectAllActive = myself.dashboard.getParameterValue(selectAllParamName),
                            newSelectAllState = !isSelectAllActive,
                            selectedCssClass  = "selected";

                        myself.dashboard.setParameter(selectionListName, []);
                        myself.dashboard.setParameter(selectAllParamName, newSelectAllState);
                        myself.selectableTable_clearSelection(selectionListName, selectAllParamName, selectedCountParamName, totalCountParamName);

                        myself.dashboard.fireChange(updateCountersEventName, $.now());

                        myself.selectableTable_getRowsOnPage().find("button")
                            [newSelectAllState ? 'addClass' : 'removeClass'](selectedCssClass);

                        myself.selectableTable_updateSelectAllOnPageStatus(selectedCssClass, selectableColIdx);

                        // While adding empty, full and mixed css-classes, kept active class implementation
                        //	in case button toggle status knowledge becomes handy at DOM in a future situation.
                        $ph.toggleClass("active");

                        // New implementation of selectAll css class management.
                        myself.selectableTable_updateSelectAllVisStatus(selectionListName, selectAllParamName, totalCountParamName);
                    }

                    function selectAllOnPageCallback() {
                        var $ph = $(this).parent(),
                            isSelectAllOnPageActive = $ph.hasClass("active"),
                            // isSelectAllActive is telling if we're dealing with a negative selection
                            isSelectAllActive = myself.dashboard.getParameterValue(selectAllParamName),
                            $visRows = myself.selectableTable_getRowsOnPage(),
                            $selectedRows = myself.selectableTable_getSelectedRowsFromRowsList($visRows, "selected", selectableColIdx),
                            allOnPageList = myself.selectableTable_getColDataFromRowList(selectableColIdx, $visRows),
                            selectionList = myself.dashboard.getParameterValue(selectionListName),
                            updatedSelectionList = [],
                            selectionTotalDelta,
                            selectedTotalCount = myself.dashboard.getParameterValue(selectedCountParamName);

                        if (isSelectAllOnPageActive) {
                            updatedSelectionList = isSelectAllActive
                                ? _.union(selectionList, allOnPageList)
                                : _.difference(selectionList, allOnPageList);

                            $visRows.find(".column" + selectableColIdx).find("button").removeClass("selected");
                            selectionTotalDelta = 0 - $selectedRows.length;
                        } else {
                            updatedSelectionList = isSelectAllActive
                                ? _.difference(selectionList, allOnPageList)
                                : _.union(selectionList, allOnPageList);

                            $visRows.find(".column" + selectableColIdx).find("button").addClass("selected");
                            selectionTotalDelta = $visRows.length - $selectedRows.length;
                        }

                        myself.dashboard.setParameter(selectionListName, updatedSelectionList);
                        myself.dashboard.setParameter(selectedCountParamName, selectedTotalCount + selectionTotalDelta);
                        myself.dashboard.fireChange(updateCountersEventName, $.now());

                        $ph.toggleClass("active");
                        myself.selectableTable_checkAndProcessFullDataSelection(selectionListName, selectAllParamName, selectedCountParamName, totalCountParamName);
                        // update check/update selectAll status
                        myself.selectableTable_updateSelectAllVisStatus(selectionListName, selectAllParamName, totalCountParamName);
                    }
                };

                this.fnDrawCallback = function(v) {
                    var selectableColIdx = 0;
                    this.selectableTable_updateSelectAllOnPageStatus("selected", selectableColIdx);
                }

                this.preExecution = function() {
                    this.selectableTable_addInSetting(
                        options.selectionListName,
                        options.selectAllParamName,
                        options.updateCountersEventName,
                        options.selectedCountParamName,
                        options.totalCountParamName,
                        options.selectableColIdx);
                };

                this.postFetch = function(data) {
                    // Bypass postFetch if empty
                    if(_.isEmpty(data.metadata) || data.resultset.length === 0) {
                        this.selectableTable_resetTotalsCount(options.totalCountParamName);
                        this.dashboard.fireChange(options.updateCountersEventName, new Date().getTime());
                        this.lastData = data;
                        return data;
                    }

                    var intrinsicSelectionCont = this.dashboard.getParameterValue(options.selectionListName).length,
                        isSelectAllActive = this.dashboard.getParameterValue(options.selectAllParamName),
                        totalCount = data.resultset.length,
                        selectionCount = isSelectAllActive
                            ? (totalCount - intrinsicSelectionCont)
                            : intrinsicSelectionCont;

                    this.dashboard.setParameter(options.selectedCountParamName, selectionCount);
                    this.dashboard.setParameter(options.totalCountParamName, totalCount);
                    this.dashboard.fireChange(options.updateCountersEventName, new Date().getTime());

                    this.lastData = data;
                };

                this.postExecution = function() {
                    var $table = $("#" + this.htmlObject);

                    this.selectableTable_buildSelectionPanelOnTable(
                        options.selectAllParamName,
                        options.selectionListName,
                        options.updateCountersEventName,
                        options.selectedCountParamName,
                        options.totalCountParamName,
                        options.selectableColIdx);

                    if(_.isEmpty(this.lastData.metadata) || this.lastData.resultset.length === 0) {
                        $table.find("thead").addClass("WDhidden");
                    }

                    this.selectableTable_updateSelectAllOnPageStatus("selected", options.selectableColIdx);
                    this.selectableTable_updateSelectAllVisStatus(options.selectionListName, options.selectAllParamName, options.totalCountParamName);
                };

                return this;
            };
        }
    }));

    Dashboard.registerGlobalAddIn("Table", "colType", new AddIn({
        name:  "selectableTable",
        label: "Table Select",
        defaults: {
            getSelectedList: function() {
                return [];
            },
            getSelectAllStatus: function() {
                return false;
            },
            buttons: [
                {
                    id: "selectBtn",
                    cssClass: "selectButton",
                    selectedCssClass: "selected",
                    title: "Select",
                    action: function(v, state) {
                        Logger.log(v);
                    }
                }
            ]
        },

        init: function() {
            $.fn.dataTableExt.oSort[this.name + '-asc' ] = $.fn.dataTableExt.oSort['string-asc'];
            $.fn.dataTableExt.oSort[this.name + '-desc'] = $.fn.dataTableExt.oSort['string-desc'];
        },

        implementation: function(target, state, options) {
            var buttons = options.buttons,
                $buttonContainer = $('<div/>')
                    .addClass('buttonContainer')
                    .addClass('numButtons-' + buttons.length);

            if(buttons.length) {
                var valueIndex = options.getSelectedList().indexOf(state.value),
                    selected   = options.getSelectAllStatus()
                        ? valueIndex === -1
                        : valueIndex  >  -1;

                _.each(buttons, function(el) {
                    var $button = $("<button/>")
                            .attr("id", el.id)
                            .addClass(el.cssClass || "")
                            .text(el.title || "")
                            .click(function() {
                                if(el.action) el.action(state.value, state);
                            });

                    if(selected) $button.addClass(el.selectedCssClass);

                    $buttonContainer.append($button);
                });
            }

            $(target).empty().append($buttonContainer);
        }
    }));
});
