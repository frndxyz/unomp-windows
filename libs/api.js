var redis = require('redis');
var async = require('async');

var stats = require('./stats.js');

module.exports = function(logger, portalConfig, poolConfigs){


    var _this = this;

    var portalStats = this.stats = new stats(logger, portalConfig, poolConfigs);

    this.liveStatConnections = {};

    this.handleApiRequest = function(req, res, next){
        switch(req.params.method){
            case 'stats':
                res.end(portalStats.statsString);
                return;
            case 'pool_stats':
                res.end(JSON.stringify(portalStats.statPoolHistory));
                return;
            case 'algo_stats':
                res.end(JSON.stringify(portalStats.statAlgoHistory));
                return;
            case 'getproxystate':                
                portalStats.getProxyState(req.params.param, function (state) {
                                        
                    res.end(state);
                  
                });
                return;
            case 'getcurrentprofit':
                portalStats.getCurrentProfit(req.params.param, function (state) {
                    
                    res.end(state);
                  
                });
                return;

            case 'gettotalpaid':
                portalStats.getTotalPaid(req.params.param, function (state) {
                    
                    res.end(state);
                  
                });
                return;

            case 'getlastprofit':
                portalStats.getLastProfit(req.params.param, function (state) {
                    
                    res.end(state);
                  
                });
                return;

            case 'getpaymentcoins':
                portalStats.getPaymentCoins(function (obj) {
                    
                    res.end(JSON.stringify(obj));
                  
                });
                return;

            case 'currentearning':
                portalStats.getThisShiftEarning(req.params.param,function (data) {
                    
                    res.end(data);
                  
                });
                return;

            case 'workertotalpaid':
                portalStats.getWorkerTotalPaid(req.params.param,function (data) {
                    
                    res.end(data);
                  
                });
                return;

            case 'pendingbalance':
                portalStats.getWorkerPendingBalance(req.params.param,function (data) {
                    
                    res.end(data);
                  
                });
                return;

            case 'pastpaid':
                portalStats.getWorkerPastPaid(req.params.param, function (data) {
                    
                    res.end(JSON.stringify(data));
                  
                });
                return;
            case 'workerhashrate':
                portalStats.getWorkerHashrate(req.params.algo,req.params.address, function (data) {
                    var hashrate = data.toString() == ""? "0.00":data.toString();
                    res.end(hashrate);
                  
                });
                return;
            case 'getblocksstats':
                portalStats.getBlocksStats(function (data) {                   
                    res.end(JSON.stringify(data));                  
                });
                return;
            case 'getrounds':
                portalStats.getRounds(function (data) {
                    res.end(JSON.stringify(data));
                });
                return;
            case 'getrounddetails':
                portalStats.getRoundDetails(req.params.param, function (data) {
                    res.end(JSON.stringify(data));
                });
                return;

            case 'live_stats':
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });
                res.write('\n');
                var uid = Math.random().toString();
                _this.liveStatConnections[uid] = res;
                req.on("close", function() {
                    delete _this.liveStatConnections[uid];
                });

                return;
            default:
                next();
        }
    };
    
    
    
    //case 'get_payout':
    
    //    portalStats.getPayout(req.params.address, function () {
    
    //        var workerbalance = {
    //            address: portalStats.stats.address,
    //            balances: portalStats.stats.balances
    //        };
    
    //        res.header('Content-Type', 'application/json');
    //        res.end(JSON.stringify(workerbalance));
    //    });
    
    //    return;
            
    


    this.handleAdminApiRequest = function(req, res, next){
        switch(req.params.method){
            case 'pools': {
                res.end(JSON.stringify({result: poolConfigs}));
                return;
            }
            default:
                next();
        }
    };

};
