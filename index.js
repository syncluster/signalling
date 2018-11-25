(function () {
    "use strict";
    const _ = require('lodash');

    module.exports = class Signalling {

        constructor(principal,
                    location,
                    rels,
                    options,
                    lifecycle,
                    events_order,
                    events,
                    transitionEvent,
                    domainName,
                    userGroup,
                    users) {

            //$scope.service;
            this.principal = principal;
            this.location = location;
            this.rels = rels;
            this.options = options;
            this.lifecycle = lifecycle;
            this.events_order = events_order;
            this.events = events;
            this.transitionEvent = transitionEvent;
            this.domainName = domainName;
            this.userGroup = userGroup;
            this.users = users;
        }

        broadcast(lifecycle) {
            this.lifecycle = lifecycle;
            console.log(lifecycle);
            return lifecycle;
        };

        loadOption() {

        }

        load() {
            return new Promise(function (resolve, reject) {
                if (!_.isEmpty(this.principal) && _.isEmpty(this.lifecycle.items.service)) {
                    this.lifecycle.items.service = this.principal;
                }
                const links = _.first(this.lifecycle.items.service) ? _.first(this.lifecycle.items.service).links : '';
                _.forEach(links, function (value) {
                    if (value.location === this.location && value.verb === 'GET' && value.type === 'options' && value.group === this.userGroup) {
                        this.applyVerb(value.href, value.verb).then(function (results) {
                            if (results && results.data && !_.isEmpty(results.data.items)) {
                                if (_.isEmpty(_.filter(this.rels, {rel: this.location}))) {
                                    var data = {options: results.data.items};
                                    _.assign(data, value);
                                    this.rels.push({rel: value.name, items: data});

                                }
                                resolve(results);
                            }
                        });
                    } else {
                        reject("No object to load()")
                    }
                });
                if (_.isEmpty(links) || links === '') {
                    reject("No object to load()")
                }
            });
        }


        loadRules() {
            return new Promise(function (resolve, reject) {
                this.load().then(function () {
                    if (!_.isEmpty(_.filter(this.rels, {rel: this.location}))) {
                        _.forEach(_.filter(this.rels, {rel: this.location}), function (value) {
                            _.forEach(value.items.options, function (items) {
                                _.forEach(items.rules, function (object) {
                                    if (object.permission && _.isEmpty(_.filter(vm.users, {rel: items.name}))) {
                                        _.forEach(object.permission, function (user) {
                                            user.rel = items.name;
                                            this.users.push(user);
                                        });
                                    }
                                    if (object.events && _.isEmpty(_.filter(this.events, {rel: items.name}))) {
                                        var event = {rel: items.name, items: object.events};
                                        this.events.push(event);
                                    }
                                    if (object.events_order && _.isEmpty(_.filter(this.events_order, {rel: items.name}))) {
                                        var event_order = {rel: items.name, items: object.events_order};
                                        this.events_order.push(event_order);
                                    }
                                });
                            });
                            resolve(value);
                        });
                    } else {
                        reject("Could not loadRules - no rels for specified location")
                    }
                });
            });


        };

        loadCache(rel) {

        };

        execute(lifecycle) {

            if (_.isEmpty(this.events_order) && _.isEmpty(_.filter(this.lifecycle.items.events_order, {rel: this.lifecycle.option}))) {
                this.loadRules().then(function () {
                    this.execute(lifecycle);
                });
            } else {
                if (!_.isEmpty(_.filter(this.events_order, {rel: this.lifecycle.option})) && _.isEmpty(_.filter(this.lifecycle.items.events_order, {rel: this.lifecycle.option}))) {
                    this.lifecycle.items.events_order = this.events_order;
                }
                if (!_.isEmpty(_.filter(this.events, {rel: this.lifecycle.option})) && _.isEmpty(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option}))) {
                    this.lifecycle.items.events = this.events;
                }
                var event = null;

                if (lifecycle.prevEvent !== '' && lifecycle.postEvent === '' && _.isNull(this.transitionEvent)) {
                    var itemEvents = _.first(_.filter(lifecycle.items.events_order, {rel: this.lifecycle.option})).items;
                    var index = _.indexOf(itemEvents, lifecycle.prevEvent);
                    index++;
                    event = itemEvents[index];
                    lifecycle.postEvent = event;
                } else if (_.isNull(this.transitionEvent)) {
                    var itemEvents_v1 = _.first(_.filter(this.lifecycle.items.events_order, {rel: this.lifecycle.option})).items;
                    event = itemEvents_v1[0];
                    this.lifecycle.postEvent = event;
                }

                var eventObject;
                var switchEvent = !_.isNull(this.transitionEvent) ? this.transitionEvent : event;

                switch (_.first(switchEvent ? switchEvent.split('_') : [' '])) {
                    case 'confirmation':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];

                        this.loadpanel('handle', this.lifecycle, eventObject.html, eventObject.modal.size);

                        break;

                    case 'get':

                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href = _.find(_.first(this.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var mapping;
                        var getOb;

                        this.applyVerb(eventObject.criteria_mapping ? href + '?' + 'where=' + JSON.stringify(this.remap(_.first(eventObject.criteria_mapping), _.first(this.lifecycle.items[eventObject.name]))) : !_.isEmpty(_.map(eventObject.keyvalue, 'where')) ? href + '?' + 'where=' + JSON.stringify(_.first(_.map(eventObject.keyvalue, 'where'))) : href,
                            _.first(switchEvent.split('_')),
                            false
                        ).then(function (results) {
                            var defer_mapping = new Promise(function (resolve, reject) {
                                if (!_.isEmpty(eventObject.mapping)) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        mapping = mappings;
                                        getOb = _.clone(mapping);
                                        _.map(_.zip(_.keys(mapping), _.values(mapping)), function (pair) {
                                            if (!_.isUndefined(pair[1]) && !_.isNull(pair[1]) && !_.isUndefined(results.data.items) && results.data.items.length > 0) {
                                                getOb[pair[0]] = _.first(results.data.items)[pair[1]];
                                            }
                                            resolve(pair);
                                        });

                                    });
                                } else {
                                    reject("eventObject.mapping is empty");
                                }
                            });

                            defer_mapping.then(function () {
                                var defer_get = new Promise(function (resolve, reject) {
                                    _.map(this.lifecycle.items[eventObject.name], function (service) {
                                        _.assign(service, getOb);
                                        resolve(service);
                                    });
                                });

                                defer_get.then(function () {
                                    this.setTransitionNull(switchEvent);
                                    this.broadcast(this.lifecycle);
                                });
                            });
                        });

                        break;

                    case 'cache':

                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];
                        this.lifecycle.items[eventObject.name] = [];

                        this.loadCache(eventObject.rel).then(function () {
                            var defer_cache = new Promise(function (resolve, reject) {
                                _.map(this.lifecycle.items[eventObject.rel], function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        this.lifecycle.items[eventObject.name].push(eventObject.keyvalue ? _.assign(this.remap(mappings, serv), eventObject.keyvalue) : this.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });

                            defer_cache.then(function () {
                                this.setTransitionNull(switchEvent);
                                this.broadcast(this.lifecycle);
                            });
                        });
                        break;

                    case 'transform':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_transform = new Promise(function (resolve, reject) {
                            _.map(this.lifecycle.items[eventObject.name], function (ob) {
                                _.map(eventObject.mapping, function (mappings) {
                                    _.merge(ob, this.remap(mappings, ob[eventObject.rel]));
                                });
                                resolve(ob);
                            });
                        });

                        defer_transform.then(function () {
                            this.setTransitionNull(switchEvent);
                            this.broadcast(this.lifecycle);
                        });
                        break;

                    case 'post':
                        var eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, eventName)[eventName];

                        var relate = _.find(_.first(this.lifecycle.items[eventObject.links]).links, {name: eventObject.rel});

                        this.applyVerb(relate.href, relate.verb, false, vm.lifecycle.items[relate.rel], {
                            'Content-Type': 'application/json'
                        });

                        break;

                    case 'new':

                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href_new = _.find(_.first(this.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var arr = [];
                        this.lifecycle.items[this.domainName] = [];
                        this.applyVerb(eventObject.criteria_mapping ? href_new + '?' + 'where=' + JSON.stringify(this.remap(_.first(eventObject.criteria_mapping), _.first(this.lifecycle.items[eventObject.name]))) : href_new,
                            'get',
                            false,
                        ).then(function (results) {
                            var defer_mapping_new = new Promise(function (resolve, reject) {
                                _.map(results.data.items, function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        arr.push(eventObject.keyvalue ? _.assign(this.remap(mappings, serv), eventObject.keyvalue) : this.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });

                            defer_mapping_new.then(function () {

                                var defer_domain = new Promise(function (resolve, reject) {
                                    _.map(arr, function (service) {
                                        this.lifecycle.items[this.domainName].push(service);
                                        resolve(service);
                                    });
                                });

                                defer_domain.then(function () {
                                    this.setTransitionNull(switchEvent);
                                    this.broadcast(this.lifecycle);
                                });
                            });
                        });
                        break;

                    case 'mergeWhere':

                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];

                        var href_assign = _.find(_.first(this.lifecycle.items[eventObject.links]).links, {name: eventObject.rel}).href;
                        var arr_assign = [];
                        var ob = {'parameter': _.map(this.lifecycle.items[eventObject.name], eventObject.keyvalue.where.parameter)};
                        this.applyVerb(eventObject.criteria_mapping ? href_assign + '?' + 'where=' + JSON.stringify(this.remap(_.first(eventObject.criteria_mapping), ob)) : href_assign,
                            'get',
                            false
                        ).then(function (results) {
                            var defer_mapping_assign = new Promise(function (resolve, reject) {
                                _.map(results.data.items, function (serv) {
                                    _.map(eventObject.mapping, function (mappings) {
                                        arr_assign.push(eventObject.keyvalue ? _.assign(this.remap(mappings, serv), eventObject.keyvalue) : this.remap(mappings, serv));
                                    });
                                    resolve(serv);
                                });
                            });


                            var key = eventObject[switchEvent].parameter;
                            var object = {};

                            defer_mapping_assign.then(function () {

                                var defer_domain = new Promise(function (resolve, reject) {
                                    _.map(vm.lifecycle.items[this.domainName], function (service) {
                                        object[key] = service[key];
                                        _.merge(service, _.first(_.filter(arr_assign, object)));
                                        resolve(service);
                                    });
                                });

                                defer_domain.then(function () {
                                    this.setTransitionNull(switchEvent);
                                    this.broadcast(this.lifecycle);
                                });
                            });
                        });
                        break;

                    case 'deleteAttribute':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_delete = new Promise(function (resolve, reject) {
                            _.map(this.lifecycle.items[eventObject.name], function (domain) {
                                _.map(eventObject.mapping, function (v2) {
                                    _.map(_.keys(v2), function (v3) {
                                        delete domain[v3];
                                    });
                                });
                                resolve(domain);
                            });
                        });

                        defer_delete.then(function () {
                            this.setTransitionNull(switchEvent);
                            this.broadcast(this.lifecycle);
                        });
                        break;

                    case 'assign':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_assign = new Promise(function (resolve, reject) {
                            _.map(vm.lifecycle.items[eventObject.name], function (domain) {
                                _.map(eventObject.mapping, function (v) {
                                    _.assign(domain, this.remap(v, domain));
                                });

                                resolve(domain);
                            });
                        });

                        defer_assign.then(function () {
                            this.setTransitionNull(switchEvent);
                            this.broadcast(this.lifecycle);
                        });
                        break;

                    case 'deleteObject':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];
                        var defer_deleteObject = new Promise(function (resolve, reject) {
                            var cl = _.clone(this.lifecycle.items[eventObject.name]);
                            _.map(cl, function (domain) {
                                _.map(eventObject.keyvalue, function (v2) {
                                    _.map(_.keys(v2), function (v3) {
                                        if (domain[v3] === v2[v3]) {
                                            _.remove(lifecycle.items[eventObject.name], domain);

                                        }
                                    });
                                });
                                resolve(domain);
                            });
                        });

                        defer_deleteObject.then(function () {
                            this.setTransitionNull(switchEvent);
                            this.broadcast(this.lifecycle);
                        });
                        break;

                    case 'eq':
                        eventObject = _.find(_.first(_.filter(this.lifecycle.items.events, {rel: this.lifecycle.option})).items, switchEvent)[switchEvent];

                        var compare = !_.isEmpty(_.filter(this.lifecycle.items[eventObject.name], _.first(eventObject.criteria)));
                        if (compare) {
                            var defer_if = new Promise(function (resolve, reject) {
                                this.transitionEvent = eventObject.transitionEvent;
                                resolve(this.transitionEvent);
                            });
                            defer_if.then(function () {
                                this.broadcast(this.lifecycle);
                            });
                        } else {
                            this.setTransitionNull(switchEvent);
                            this.broadcast(this.lifecycle);
                        }

                        break;
                }

            }
        };

        loadpanel(name, lifecycle, html, size) {

        };

        applyVerb(url, method, cache, data, headers) {

        };

        getCase() {

        };

        remap(mapping, value) {
            var newob = _.clone(mapping);
            if (value) {
                _.map(_.zip(_.keys(mapping), _.values(mapping)), function (pair) {

                    newob[pair[0]] = value[pair[1]];

                });
            }
            return newob;
        };

        setTransitionNull(event) {
            if (_.last(event.split('$')).toLowerCase() === 'transition') {
                this.transitionEvent = null;
            }
        }
    }
}());