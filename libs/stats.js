var zlib = require('zlib');

var redis = require('redis');
var async = require('async');


var os = require('os');

var algos = require('merged-pooler/lib/algoProperties.js');

// redis callback Ready check failed bypass trick
function rediscreateClient(port, host, pass, db) {
    var client = redis.createClient(port, host);
    client.auth(pass);
    client.select(db);
    return client;
}


module.exports = function (logger, portalConfig, poolConfigs) {
    
    var _this = this;
    
    var logSystem = 'Stats';
    
    var redisClients = [];
    fubar = [];
    
    var redisStats;
    
    this.statHistory = [];
    this.statPoolHistory = [];
    this.statAlgoHistory = [];
    
    this.stats = {};
    this.statsString = '';
    
    setupStatsRedis();
    gatherStatHistory();
    
    var canDoStats = true;
    
    Object.keys(poolConfigs).forEach(function (coin) {
        fubar.push(coin);
        if (!canDoStats) return;
        
        var poolConfig = poolConfigs[coin];
        
        var redisConfig = poolConfig.redis;
        
        for (var i = 0; i < redisClients.length; i++) {
            var client = redisClients[i];
            if (client.client.port === redisConfig.port && client.client.host === redisConfig.host) {
                logger.debug(logSystem, 'Global', 'coin load [' + coin + ']');
                client.coins.push(coin);
                return;
            }
        }
        redisClients.push({
            coins: [coin],
            //          client: redis.createClient(redisConfig.port, redisConfig.host)
            //            client: rediscreateClient(redisConfig.port, redisConfig.host, redisConfig.password)
            client: rediscreateClient(redisConfig.port, redisConfig.host, redisConfig.password, redisConfig.db)
        });
    });
    
    function setupStatsRedis() {
        redisStats = redis.createClient(portalConfig.redis.port, portalConfig.redis.host);
        // logger.debug(logSystem, 'Global', 'redis.Auth1 "' + portalConfig.redis.password + '"');
        redisStats.auth(portalConfig.redis.password);
        redisStats.select(portalConfig.redis.db);
        
        redisStats.on('error', function (err) {
            logger.error(logSystem, 'Historics', 'Redis for stats had an error ' + JSON.stringify(err));
        });
    }
    
    function gatherStatHistory() {
        
        var retentionTime = (((Date.now() / 1000) - portalConfig.website.stats.historicalRetention) | 0).toString();
        
        redisStats.zrangebyscore(['statHistory', retentionTime, '+inf'], function (err, replies) {
            if (err) {
                logger.error(logSystem, 'Historics', 'Error when trying to grab historical stats ' + JSON.stringify(err));
                return;
            }
            for (var i = 0; i < replies.length; i++) {
                _this.statHistory.push(JSON.parse(replies[i]));
            }
            _this.statHistory = _this.statHistory.sort(function (a, b) {
                return a.time - b.time;
            });
            _this.statHistory.forEach(function (stats) {
                addStatPoolHistory(stats);
                addStatAlgoHistory(stats);
            });
        });
    }
    
    function addStatPoolHistory(stats) {
        var data = {
            time: stats.time,
            pools: {}
        };
        for (var pool in stats.pools) {
            data.pools[pool] = {
                hashrate: stats.pools[pool].hashrate,
                workerCount: stats.pools[pool].workerCount,
                blocks: stats.pools[pool].blocks
            }
        }
        _this.statPoolHistory.push(data);
    }
    
    function addStatAlgoHistory(stats) {
        var data = {
            time: stats.time,
            algos: {}
        };
        for (var algo in stats.algos) {
            data.algos[algo] = {
                hashrate: stats.algos[algo].hashrate,
                workerCount: stats.algos[algo].workerCount,
            }
        }
        _this.statAlgoHistory.push(data);
    }
    
    
    this.getCoins = function (cback) {
        _this.stats.coins = redisClients[0].coins;
        cback();
    };
    
    this.getPayout = function (address, cback) {
        
        async.waterfall([

            function (callback) {
                
                _this.getBalanceByAddress(address, function () {
                    
                    callback(null, 'test');
                });

            }
        ], function (err, total) {
            
            //cback(total.toFixed());
            cback();
        });
    };
    
    this.getProxyState = function (algo, cback) {
        var client = redisClients[0].client;
        
        client.hget("proxyState", algo, function (error, data) {
            if (error) {
                cback("error");
                return;
            }
            
            cback(data);


        });


    }    
    
    this.getCurrentProfit = function (algo, cback) {
        var client = redisClients[0].client;
        
         
        client.hget("Pool_Stats:CurrentShift", "Profitability_" + algo, function (error, data) {
            if (error) {
                cback("error");
                return;
            }
            
            cback(data);    


        });   
     
    
        
    }
    
    this.getLastProfit = function (algo, cback) {
        var client = redisClients[0].client;
        
        
        client.hget("API",algo, function (error, data) {
            if (error) {
                cback("error");
                return;
            }
            
            cback(data);


        });   
        
    }
    
    this.getTotalPaid = function (coin, cback) {
        var client = redisClients[0].client;
        
        
        client.hget("Worker_Stats:Total"+coin+"Paid", "Total", function (error, data) {
            if (error) {
                cback("error");
                return;
            }
            
            cback(data);


        });
        
    }
    
    this.getPaymentCoins = function (cback) {
        var client = redisClients[0].client;
        
        
        client.hgetall("paymentCoins", function (error, data) {
            if (error) {
                cback("");
                return;
            }
           
            cback(data);

        });

    }
    
    this.getThisShiftEarning = function (address,cback) {
        var client = redisClients[0].client;
       
        var part = address.split(".");
        if (part.length != 2) {
            cback("");
            return;
        }

        var symbol = part[1].toUpperCase();

        client.hget("Pool_Stats:CurrentShift:Worker" + symbol + "Coin",address, function (error, data) {
            if (error) {
                cback("");
                return;
            }

            cback(data);
        });



    };    
    
    this.getWorkerTotalPaid = function (address, cback) {
        var client = redisClients[0].client;
        
        
        client.hget("Worker_Stats:TotalPaid", address, function (error, data) {
            if (error) {
                cback("");
                return;
            }
            
            cback(data);
        });



    };
    
    this.getWorkerPendingBalance = function (address, cback) {
        var client = redisClients[0].client;
        
        
        client.zscore("Pool_Stats:Balances", address, function (error, data) {
            if (error) {
                cback("");
                return;
            }
            
            cback(data);
        });



    };
 
    this.getWorkerPastPaid = function (address, cback) {
        var client = redisClients[0].client;        
        
        client.lrange("Worker_Stats:Payouts:"+address,0,7, function (error, data) {
            if (error) {
                cback("");
                return;
            }
            
            cback(data);
        });



    };
    
    this.getWorkerHashrate = function (algo, address, cback) {

        var client = redisClients[0].client;
        client.zrange("Pool_Stats:WorkerHRs:" + algo + ":" + address, -1, -1, function (error, data) { 
            if (error) {
                cback("");
                return;
            }

            cback(data);
        
        });

    };
    
    this.getBlocksStats = function (cback) {
        var client = redisClients[0].client;
        client.hgetall("Allblocks", function (error, data) {
            if (error) {
                logger.log("error:-" + error);
                cback("");
                return;
            }
            
            cback(data);
        
        });
    };    

    this.getBalanceByAddress = function(address, cback){

        var client = redisClients[0].client,
            coins = fubar,
            balances = [];
            payouts = [];
            
                    client.hgetall('Payouts:' + address, function(error, txns){
                                                                         //logger.error(logSystem, 'TEMP', 'txnid variable is:' + txnid);

                                                                        if (error) {
                                                                                callback ('There was no payouts found');
                                                                                return;
                                                                        }
                                                                        if(txns === null){
                                                                               var index = [];
                                                                               } else{
                                                                               payouts=txns;

                                                                               }

        });
        

        async.each(coins, function(coin, cb){
            client.hget(coin + ':balances', address, function(error, result){
                if (error){
                    callback('There was an error getting balances');
                    return;
                }
                if(result === null) {
                    result = 0;
                }else{
                    result = result;
                }
            client.hget(coin + ':payouts', address, function(error, paid){
                if (error){
                    callback('There was an error getting payouts');
                    return;
                }
                if(paid === null) {
                    paid = 0;
                }else{
                    paid = paid;
                }
                balances.push({
                    coin:coin,
                    balance:result,
		           paid:paid
                });
                cb();
            });
            });
        }, function (err){

if (err){
console.log('ERROR FROM STATS.JS ' + err);
            cback();
} else {
            _this.stats.balances = balances;
            _this.stats.address = address;
            cback();
            }

        });
    };

    this.getGlobalStats = function(callback){

        var statGatherTime = Date.now() / 1000 | 0;

        var allCoinStats = {};

        async.each(redisClients, function(client, callback){
            var windowTime = (((Date.now() / 1000) - portalConfig.website.stats.hashrateWindow) | 0).toString();
            var redisCommands = [];


            var redisCommandTemplates = [
                ['zremrangebyscore', ':hashrate', '-inf', '(' + windowTime],
                ['zrangebyscore', ':hashrate', windowTime, '+inf'],
                ['hgetall', ':stats'],
                ['scard', ':blocksPending'],
                ['scard', ':blocksConfirmed'],
                ['scard', ':blocksOrphaned']
            ];

            var commandsPerCoin = redisCommandTemplates.length;

            client.coins.map(function(coin){
                redisCommandTemplates.map(function(t){
                    var clonedTemplates = t.slice(0);
                    clonedTemplates[1] = coin + clonedTemplates[1];
                    redisCommands.push(clonedTemplates);
                });
            });


            client.client.multi(redisCommands).exec(function(err, replies){
                if (err){
                    logger.error(logSystem, 'Global', 'error with getting global stats ' + JSON.stringify(err));
                    callback(err);
                }
                else{
                    for(var i = 0; i < replies.length; i += commandsPerCoin){
                        var coinName = client.coins[i / commandsPerCoin | 0];
                        var coinStats = {
                            name: coinName,
                            symbol: poolConfigs[coinName].coin.symbol.toUpperCase(),
                            algorithm: poolConfigs[coinName].coin.algorithm,
                            hashrates: replies[i + 1],
                            poolStats: {
                                validShares: replies[i + 2] ? (replies[i + 2].validShares || 0) : 0,
                                validBlocks: replies[i + 2] ? (replies[i + 2].validBlocks || 0) : 0,
                                invalidShares: replies[i + 2] ? (replies[i + 2].invalidShares || 0) : 0,
                                totalPaid: replies[i + 2] ? (replies[i + 2].totalPaid || 0) : 0
                            },
                            blocks: {
                                pending: replies[i + 3],
                                confirmed: replies[i + 4],
                                orphaned: replies[i + 5]
                            }
                        };
                        allCoinStats[coinStats.name] = (coinStats);
                    }
                    callback();
                }
            });
        }, function(err){
            if (err){
                logger.error(logSystem, 'Global', 'error getting all stats' + JSON.stringify(err));
                callback();
                return;
            }

            var portalStats = {
                time: statGatherTime,
                global:{
                    workers: 0,
                    hashrate: 0
                },
                algos: {},
                pools: allCoinStats
            };

            Object.keys(allCoinStats).forEach(function(coin){
                var coinStats = allCoinStats[coin];
                coinStats.workers = {};
                coinStats.shares = 0;
                coinStats.hashrates.forEach(function(ins){
                    var parts = ins.split(':');
                    var workerShares = parseFloat(parts[0]);
                    var worker = parts[1];
                    if (workerShares > 0) {
                        coinStats.shares += workerShares;
                        if (worker in coinStats.workers)
                            coinStats.workers[worker].shares += workerShares;
                        else
                            coinStats.workers[worker] = {
                                shares: workerShares,
                                invalidshares: 0,
                                hashrateString: null
                            };
                    }
                    else {
                        if (worker in coinStats.workers)
                            coinStats.workers[worker].invalidshares -= workerShares; // workerShares is negative number!
                        else
                            coinStats.workers[worker] = {
                                shares: 0,
                                invalidshares: -workerShares,
                                hashrateString: null
                            };
                    }
                });

                var shareMultiplier = Math.pow(2, 32) / algos[coinStats.algorithm].multiplier;
                coinStats.hashrate = shareMultiplier * coinStats.shares / portalConfig.website.stats.hashrateWindow;

                coinStats.workerCount = Object.keys(coinStats.workers).length;
                portalStats.global.workers += coinStats.workerCount;

                /* algorithm specific global stats */
                var algo = coinStats.algorithm;
                if (!portalStats.algos.hasOwnProperty(algo)){
                    portalStats.algos[algo] = {
                        workers: 0,
                        hashrate: 0,
                        hashrateString: null
                    };
                }
                portalStats.algos[algo].hashrate += coinStats.hashrate;
                portalStats.algos[algo].workers += Object.keys(coinStats.workers).length;

                for (var worker in coinStats.workers) {
                    coinStats.workers[worker].hashrateString = _this.getReadableHashRateString(shareMultiplier * coinStats.workers[worker].shares / portalConfig.website.stats.hashrateWindow);
                }

                delete coinStats.hashrates;
                delete coinStats.shares;
                coinStats.hashrateString = _this.getReadableHashRateString(coinStats.hashrate);
            });

            Object.keys(portalStats.algos).forEach(function(algo){
                var algoStats = portalStats.algos[algo];
                algoStats.hashrateString = _this.getReadableHashRateString(algoStats.hashrate);
            });

            _this.stats = portalStats;
            _this.statsString = JSON.stringify(portalStats);



            _this.statHistory.push(portalStats);
            addStatPoolHistory(portalStats);
            addStatAlgoHistory(portalStats);

            var retentionTime = (((Date.now() / 1000) - portalConfig.website.stats.historicalRetention) | 0);

            for (var i = 0; i < _this.statHistory.length; i++){
                if (retentionTime < _this.statHistory[i].time){
                    if (i > 0) {
                        _this.statHistory = _this.statHistory.slice(i);
                        _this.statPoolHistory = _this.statPoolHistory.slice(i);
                        _this.statAlgoHistory = _this.statAlgoHistory.slice(i);
                    }
                    break;
                }
            }

            redisStats.multi([
                ['zadd', 'statHistory', statGatherTime, _this.statsString],
                ['zremrangebyscore', 'statHistory', '-inf', '(' + retentionTime]
            ]).exec(function(err, replies){
                if (err)
                    logger.error(logSystem, 'Historics', 'Error adding stats to historics ' + JSON.stringify(err));
            });
            callback();
        });

    };

    this.getRounds = function (cback) {
        var client = redisClients[0].client;
        var allrounds = [];

        client.lrange("Pool_Stats:Rounds", 0, 10, function (error, rounds) {
            if (error) {
                logger.log("error:-" + error);
                cback("");
                return;
            }
            
           
            async.each(rounds, function (round, callback) {
                var details = {};

                

                client.multi([["hget", "Pool_Stats:" + round, "starttime"],
                    ["hget", "Pool_Stats:" + round, "endtime"],
                    ["hget", "Pool_Stats:" + round + ":stats", "validShares"],
                ["hget", "Pool_Stats:" + round + ":stats", "invalidShares"],
                ["hget", "Pool_Stats:" + round + ":Algos", "Total"]]).exec(function (err, data) {


                    if (err) {
                        callback();
                        return;
                    }

                    var starttime = data[0];
                    var endtime = data[1];
                    var validShares = data[2];
                    var invalidShares = data[3];
                    var totalBtc = data[4];

                    var diff = parseInt(endtime) - parseInt(starttime);
                    var hours = (diff / 60 / 60);

                    allrounds.push({
                        roundno: round,
                        hours: hours,
                        validshares: validShares,
                        invalidshares: invalidShares,
                        totalbtc: totalBtc

                    });
                    callback();
                });

                

            }, function (err) {
                if (err) {
                    cback(err);

                }
                else {
                    cback(allrounds);
                }

            });

        });
    };

    this.getRoundDetails=function(round,cback)
    {
        var client = redisClients[0].client;

        var workerpaymentdetails = [];
        var workersharedetails = [];


        client.hgetall("Pool_Stats:" + round + ":stats", function (error, data) {
            if (error) {
                cback("");
                return;
            }

            for (var field in data) {
                if (field == "validShares" || field == "invalidShares") continue;

                workersharedetails.push({
                    worker: field,
                    shares:data[field]
                });

            };
       
        client.hgetall("Pool_Stats:"+round+":Shift", function (error, data) {
            if(error)
            {
                cback("");
                return;
            } 
                
                for (var worker in data)
                {
                    workerpaymentdetails.push({
                        worker: worker,                       
                        paid: data[worker]

                    });                    
                }

            //callback after both details fills
                cback({
                    workerpaymentdetails: workerpaymentdetails,
                    workersharedetails: workersharedetails
                });


        });

        

        });

    }

    this.getReadableHashRateString = function(hashrate){
        var i = -1;
        var byteUnits = [ ' KH', ' MH', ' GH', ' TH', ' PH' ];
        do {
            hashrate = hashrate / 1000;
			i++;
        } while (hashrate > 1000);
        return hashrate.toFixed(2) + byteUnits[i];
    };

};
