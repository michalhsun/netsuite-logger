/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Author                    Date         Change Comments
 * 
 */
define(
  ['N/search', 'N/runtime', 'SuiteScripts/HSUN/HSUNserverLogger', 'N/format/i18n'],
  function (search, runtime, serverLogger, formati18n) {
    var logger;

    var loggerParams = {
      suspendLogging: true,
      //emailLogToAddress: '',
      emailLogToCompanyInfoField: 'custrecord_hsun_emailscriptlogto',
      emailSenderCompanyInfoField: 'custrecord_hsun_systemagent'
    }

    function createLogger(suspendLogging) {
      logger = new serverLogger.ServerLogger({
        suspendLogging: runtime.envType === runtime.EnvType.PRODUCTION && suspendLogging && loggerParams.suspendLogging,
        emailLogTo: loggerParams.emailLogToAddress
      });
      logger.loadParamsFromCompanyInfo({
        emailLogTo: loggerParams.emailLogToCompanyInfoField,
        emailSender: loggerParams.emailSenderCompanyInfoField
      });
    }

    var utils = {
      isEmpty: function (value) { return (value == null || value === ''); }
    };

    var module = {};

    /**
    * @param {object} execStatus - an object with time and usage properties where start is already captured
    * @param {number} usageEnd - runtime.getCurrentScript().getRemainingUsage() at the end of execution
    * @returns {void}
    */
    function captureExecEnd(execStatus, usageEnd) {
      execStatus.time.end = new Date();
      execStatus.time.delta = (execStatus.time.end - execStatus.time.start) / 1000;
      execStatus.usage.end = usageEnd;
      execStatus.usage.delta = (execStatus.usage.start - execStatus.usage.end);
    }

    /**
    * Map/Reduce Script getInputData stage implementation
    * @param {object} inputContext - 
    * @param {boolean} inputContext.isRestarted - does the current invocation represent a restart
    * @param {object} inputContext.ObjectRef - the search or file object that contains the input data.
    * @param {string} inputContext.ObjectRef.type - object’s type
    * @param {number | string} inputContext.ObjectRef.id - internal ID or script ID of an object
    * @returns {Array | Object} - one of:
                                    Array of data, 
                                    Object with data as its properties, 
                                    search.Search Object, 
                                    file.File object, 
                                    query.Query object, 
                                    search.Search, file.File, query.Query object reference {type: 'search', id: 1234}
    */
    module.getInputData = function (inputContext) {
      var execTimeStart = new Date();
      var currentScript = runtime.getCurrentScript();
      var execUsageStart = currentScript.getRemainingUsage();
      createLogger(false);
      logger.logStart({
        mapReduceGetInputDataContext: inputContext
      });
      logger.logDebug('inputContext: ' + JSON.stringify(inputContext));
      try {
        var execStatus = {
          success: true,
          time: {
            start: execTimeStart,
            end: null,
            delta: null,
          },
          usage: {
            start: execUsageStart,
            end: null,
            delta: null,
          }
        };
        // OPTIONAL - testing script parameters used with later stages to avoid many failures 
        var updateLogicJSON = currentScript.getParameter({
          name: "custscript_???????????????_scriptlogic"
        });
        try {
          var updateLogic = JSON.parse(updateLogicJSON);
        } catch (objError) {
          logger.logError('Invalid Update Logic JSON: ' + updateLogicJSON);
          logger.logError(logger.logErrorObj(objError));
          execStatus.success = false;
        }

        // OPTIONAL - loading a saved search that provide data the script runs on
        var searchId = currentScript.getParameter({ name: 'custscript_???????????????_scopesearch' });
        logger.logDebug('Search Id: ' + searchId);
        try {
          var searchObj = search.load({ id: searchId });
          logger.logDebug('Search: ' + JSON.stringify(searchObj));
        } catch (objError) {
          logger.logError('Invalid or missing saved search: ' + JSON.stringify(searchObj));
          logger.logError(logger.logErrorObj(objError));
          execStatus.success = false;
        }
        captureExecEnd(execStatus, currentScript.getRemainingUsage());
        logger.logEnd(JSON.stringify(execStatus));
        if (execStatus.success) {
          return searchObj;
        }
      } catch (objError) {
        logger.logError(logger.logErrorObj(objError));
        captureExecEnd(execStatus, currentScript.getRemainingUsage());
        logger.logEnd(JSON.stringify(execStatus));
      }
    }

    /**
    * Map/Reduce Script map stage implementation
    * @param {object} mapContext - 
    * @param {object} mapContext.isRestarted - 
    * @param {object} mapContext.executionNo - 
    * @param {object} mapContext.errors - 
    * @param {object} mapContext.key - 
    * @param {object} mapContext.value - 
    * @param {void} mapContext.write(options) - 
    * @returns {void}
    */
    module.map = function (mapContext) {
      var execTimeStart = new Date();
      var currentScript = runtime.getCurrentScript();
      var execUsageStart = currentScript.getRemainingUsage();
      createLogger(true);
      logger.logStart({
        mapReduceMapContext: mapContext
      });
      logger.logDebug('mapContext: ' + JSON.stringify(mapContext));
      if (mapContext.executionNo > 1) {
        logger.logAudit('executionNo: ' + mapContext.executionNo + ' - this set of data is executed again.');
      }
      try {
        logger.logDebug('key: ' + mapContext.key + ', typeof value: ' + typeof mapContext.value);
        var execStatus = {
          success: true,
          time: {
            start: execTimeStart,
            end: null,
            delta: null,
          },
          usage: {
            start: execUsageStart,
            end: null,
            delta: null,
          },
          errors: []
        };
        execStatus.usage.start = currentScript.getRemainingUsage();
        execStatus.key = mapContext.key;
        execStatus.data = JSON.parse(mapContext.value);
        execStatus.logKey = logger.logTitle;

        // CUSTOM CODE
        execStatus.reduceKey = execStatus.data.recordType + '>' + execStatus.data.id;



      } catch (objError) {
        execStatus.status = false;
        execStatus.errors.push(objError);
        logger.logError(logger.logErrorObj(objError));
      }
      mapContext.write({ key: execStatus.reduceKey, value: execStatus });
      captureExecEnd(execStatus, currentScript.getRemainingUsage());
      logger.logEnd(JSON.stringify(execStatus));
    }

    /**
    * Map/Reduce Script reduce stage implementation
    * @param {object} reduceContext - 
    * @param {Boolean} reduceContext.isRestarted - 
    * @param {number} reduceContext.executionNo - 
    * @param {iterator} reduceContext.errors - 
    * @param {string} reduceContext.key - 
    * @param {string[]} reduceContext.values - 
    * @param {void} reduceContext.write(options) - 
    * @returns {void} 
    */
    module.reduce = function (reduceContext) {
      var execTimeStart = new Date();
      var currentScript = runtime.getCurrentScript();
      var execUsageStart = currentScript.getRemainingUsage();
      createLogger(true);
      logger.logStart({
        mapReduceReduceContext: reduceContext
      });
      logger.logDebug('reduceContext: ' + JSON.stringify(reduceContext));
      if (reduceContext.executionNo > 1) {
        logger.logAudit('executionNo: ' + reduceContext.executionNo + ' - this set of data is executed again.');
      }
      try {
        var currentScript = runtime.getCurrentScript();
        logger.logDebug('key: ' + reduceContext.key + ', values count: ' + reduceContext.values.length);
        var execStatus = {
          success: true,
          time: {
            start: execTimeStart,
            end: null,
            delta: null,
          },
          usage: {
            start: execUsageStart,
            end: null,
            delta: null,
          },
          errors: []
        };
        execStatus.usage.start = currentScript.getRemainingUsage();
        execStatus.logKey = logger.logTitle;
        execStatus.key = reduceContext.key;
        execStatus.dataCount = reduceContext.values.length;
        execStatus.data = [];
        for (var index = 0; index < reduceContext.values.length; index++) {
          execStatus.data.push(JSON.parse(reduceContext.values[index]));
        }
        logger.logDebug('data: ' + JSON.stringify(execStatus.data));

        //CUSTOM CODE



      } catch (objError) {
        execStatus.success = false;
        execStatus.errors.push(objError);
        logger.logError(logger.logErrorObj(objError));
      }
      reduceContext.write({ key: execStatus.key, value: execStatus });
      captureExecEnd(execStatus, currentScript.getRemainingUsage());
      logger.logEnd(JSON.stringify(execStatus));
    }

    /**
    * Map/Reduce Script summarise stage implementation
    * @param {object} summaryContext - 
    * @param {Boolean} summaryContext.isRestarted - Indicates whether the current invocation of the summarize(summaryContext) function represents a restart.
    * @param {number} summaryContext.concurrency - The maximum concurrency number when running the map/reduce script.
    * @param {Date} summaryContext.dateCreated - The time and day when the script began running.
    * @param {number} summaryContext.seconds - The total number of seconds that elapsed during the processing of the script.
    * @param {number} summaryContext.usage - The total number of usage units consumed during the processing of the script.
    * @param {number} summaryContext.yields - The total number of yields that occurred during the processing of the script.
    * @param {object} summaryContext.inputSummary - Object that contains data about the input stage.
    * @param {Date} summaryContext.inputSummary.dateCreated - The time and day when the getInputData(inputContext) function began running.
    * @param {string} summaryContext.inputSummary.error - Holds serialized errors thrown from the getInputData(inputContext) function.
    * @param {number} summaryContext.inputSummary.seconds - The total number of seconds that elapsed during execution of the getInputData(inputContext) function.
    * @param {number} summaryContext.inputSummary.usage - The total number of usage units consumed by processing of the getInputData(inputContext) function.
    * @param {object} summaryContext.mapSummary - Object that contains data about the map stage.
    * @param {number} summaryContext.mapSummary.concurrency - Maximum concurrency number when running map(mapContext).
    * @param {Date} summaryContext.mapSummary.dateCreated - The time and day when the first invocation of map(mapContext) function began.
    * @param {iterator} summaryContext.mapSummary.errors - Holds serialized errors thrown during the map stage.
    * @param {iterator} summaryContext.mapSummary.keys - Holds the keys passed to the map stage by the getInputData stage.
    * @param {number} summaryContext.mapSummary.seconds - The total number of seconds that elapsed during the map stage.
    * @param {number} summaryContext.mapSummary.usage - The total number of usage units consumed during the map stage.
    * @param {number} summaryContext.mapSummary.yields - The total number of yields that occurred during the map stage.
    * @param {object} summaryContext.reduceSummary - Object that contains data about the reduce stage.
    * @param {number} summaryContext.reduceSummary.concurrency - Maximum concurrency number when running reduce(reduceContext).
    * @param {Date} summaryContext.reduceSummary.dateCreated - The time and day when the first invocation of the reduce(reduceContext) function began.
    * @param {iterator} summaryContext.reduceSummary.errors - Holds serialized errors thrown during the reduce stage.
    * @param {iterator} summaryContext.reduceSummary.keys - olds the keys passed to the reduce stage.
    * @param {number} summaryContext.reduceSummary.seconds - The total number of seconds that elapsed during the reduce stage.
    * @param {number} summaryContext.reduceSummary.usage - The total number of usage units consumed during the reduce stage.
    * @param {number} summaryContext.reduceSummary.yields - The total number of yields that occurred during the reduce stage.
    * @param {iterator} summaryContext.output - Iterator that contains the keys and values saved as the output of the reduce stage.
    * @returns {viod} 
    */
    module.summarize = function (summaryContext) {
      var execTimeStart = new Date();
      var currentScript = runtime.getCurrentScript();
      var execUsageStart = currentScript.getRemainingUsage();
      createLogger(false);
      logger.logStart({
        mapReduceSummarizeContext: summaryContext
      });
      logger.logDebug('summaryContext: ' + JSON.stringify(summaryContext));
      try {
        var execStatus = {
          success: true,
          time: {
            start: execTimeStart,
            end: null,
            delta: null,
          },
          usage: {
            start: execUsageStart,
            end: null,
            delta: null,
          },
          noOfSuccess: 0,
          noOfFailures: 0,
          noOfErrors: 0,
          countMap: 0,
          inputExec: {},
          mapExec: {
            failedItems: {}
          },
          reduceExec: {
            failedItems: {}
          },
          output: {
            count: 0,
            timeMin: 3600000, // 60 minutes * 60 seconds * 1000 miliseconds
            timeMax: 0,
            timeTotal: 0,
            timeAverage: 0,
            usageMin: 10000,  // total available usage points
            usageMax: 0,
            usageTotal: 0,
            usageAverage: 0
          }
        };
        execStatus.usage.start = currentScript.getRemainingUsage();
        var numberFormatter = formati18n.getNumberFormatter({
          groupSeparator: "",
          decimalSeparator: ".",
          precision: 3,
          negativeNumberFormat: formati18n.NegativeNumberFormat.MINUS
        });
        summaryContext.output.iterator().each(function (key, value) {
          //logger.logDebug('Summary - output ' + key + ': ' + value);
          try {
            var oneOutput = JSON.parse(value);
            execStatus.countMap += oneOutput.dataCount;
            if (oneOutput.success) {
              execStatus.noOfSuccess++;
              execStatus.output.count++;
              execStatus.output.timeTotal += oneOutput.time.delta;
              execStatus.output.usageTotal += oneOutput.usage.delta;
              if (oneOutput.time.delta < execStatus.output.timeMin) {
                execStatus.output.timeMin = oneOutput.time.delta;
              }
              if (oneOutput.time.delta > execStatus.output.timeMax) {
                execStatus.output.timeMax = oneOutput.time.delta;
              }
              if (oneOutput.usage.delta < execStatus.output.usageMin) {
                execStatus.output.usageMin = oneOutput.usage.delta
              }
              if (oneOutput.usage.delta > execStatus.output.usageMax) {
                execStatus.output.usageMax = oneOutput.usage.delta
              }
            } else {
              execStatus.noOfFailures++;
            }
          } catch (objError) {
            logger.logError(logger.logErrorObj(objError));
            logger.logError('Processed data that caused the error: ' + JSON.stringify(oneOutput));
          }
          return true;
        });
        if (execStatus.output.count === 0) {
          execStatus.output.timeAverage = numberFormatter.format({ number: 0 });
          execStatus.output.usageAverage = numberFormatter.format({ number: 0 });
        } else {
          execStatus.output.timeAverage = numberFormatter.format({
            number: (execStatus.output.timeTotal / execStatus.output.count)
          });
          execStatus.output.usageAverage = numberFormatter.format({
            number: (execStatus.output.usageTotal / execStatus.output.count)
          });
        }
        execStatus.inputExec.dateCreated = summaryContext.inputSummary.dateCreated;
        execStatus.inputExec.seconds = summaryContext.inputSummary.seconds;
        execStatus.inputExec.usage = summaryContext.inputSummary.usage;

        function captureStage(stageSummary, stageExecStatus) {
          stageExecStatus.concurrency = stageSummary.concurrency;
          stageExecStatus.dateCreated = stageSummary.dateCreated;
          stageExecStatus.seconds = stageSummary.seconds;
          stageExecStatus.usage = stageSummary.usage;
          stageExecStatus.yields = stageSummary.yields;
          stageSummary.errors.iterator().each(function (key, error, executionNo) {
            var errorObject = JSON.parse(error);
            execStatus.noOfFailures++;
            //stageExecStatus.failedItems[key] = oneOutput;
            if (stageExecStatus.failedItems[errorObject.name] == null)
              stageExecStatus.failedItems[errorObject.name] = {}
            if (stageExecStatus.failedItems[errorObject.name][key] != null) {
              if (!Array.isArray(stageExecStatus.failedItems[errorObject.name][key])) {
                var saveEntry = stageExecStatus.failedItems[errorObject.name][key];
                stageExecStatus.failedItems[errorObject.name][key] = [saveEntry];
              }
              stageExecStatus.failedItems[errorObject.name][key].push(errorObject);
            } else {
              stageExecStatus.failedItems[errorObject.name][key] = errorObject;
            }
            logger.logError('Reduce error - key: ' + key + ', execution no. ' + executionNo + ', details: ' + error);
            return true;
          });
        }

        captureStage(summaryContext.reduceSummary, execStatus.reduceExec);
        captureStage(summaryContext.mapSummary, execStatus.mapExec);
        if (execStatus.noOfFailures > 0 || execStatus.noOfErrors > 0) {
          logger.logAudit('noOfFailures: ' + execStatus.noOfFailures + ', noOfErrors: ' + execStatus.noOfErrors);
        }

        // CUSTOM CODE



      } catch (objError) {
        logger.logError(logger.logErrorObj(objError));
      }
      captureExecEnd(execStatus, currentScript.getRemainingUsage());
      logger.logEnd(JSON.stringify(execStatus));
    }

    return module
  });