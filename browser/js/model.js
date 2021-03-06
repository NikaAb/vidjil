/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013-2017 by Bonsai bioinformatics
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors:
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */

/* @module utils */

/**
 * Model.js
 *
 * contains data models, control function and a comparison function (mySortedArray)
 * data models are stocked here and can be accessed by the different views to be displayed
 * everytime a data model is modified by a control function the views are called to be updated
 * */

VIDJIL_JSON_VERSION = '2014.09';

SIZE_MANUALLY_ADDED_CLONE = 100000; // Default size of a manually added clone.

/** Model constructor
 * Used to parse a .vidjil file (local file or from url) and store his content in a more convenient way, <br>
 * provide manipulation function, <br>
 * takes care to warn all linked views when changes happens. <br>
 * @class Model
 * @constructor 
 * */
function Model() {
    var self=this;
    console.log("creation Model")
    
    for (var f in Model_loader.prototype) {
        this[f] = Model_loader.prototype[f]
    }
    this.germline = {};
    this.create_germline_obj();
    this.view = [];
    this.setAll();
    this.checkBrowser();
    this.germlineList = new GermlineList()
    this.build();
    window.onresize = function () { self.resize(); };
}


Model.prototype = {
    /**
     * Build html elements used by model
     * */
    build: function () {
        var self =this;
        
        this.waiting_screen = document.createElement("div");
        this.waiting_screen.className = "waiting_screen";
        
        this.waiting_msg = document.createElement("div")
        this.waiting_msg.className = "waiting_msg";
        
        this.waiting_screen.appendChild(this.waiting_msg);
        document.body.appendChild(this.waiting_screen);
        
                
        //build infoBox
        
        this.infoBox = document.createElement("div");
        this.infoBox.className = "modal info-container";
        
        var closeinfoBox = document.createElement("span");
        closeinfoBox.className = "closeButton" ;
        closeinfoBox.appendChild(icon('icon-cancel', ''));
        closeinfoBox.onclick = function() {self.closeInfoBox()};
        this.infoBox.appendChild(closeinfoBox);
        
        var div_info = document.createElement("div");
        div_info.className = "info-msg";
        this.infoBox.appendChild(div_info);
        
        document.body.appendChild(this.infoBox);
        
        //build tagSelector
        this.tagSelector = document.createElement("div");
        this.tagSelector.className = "tagSelector";
        
        var closeTag = document.createElement("span");
        closeTag.className = "closeButton" ;
        closeTag.appendChild(icon('icon-cancel', ''));
        closeTag.onclick = function() {$(this).parent().hide('fast')};
        this.tagSelector.appendChild(closeTag);
        
        this.tagSelectorInfo = document.createElement("div")
        this.tagSelector.appendChild(this.tagSelectorInfo);
        
        this.tagSelectorList = document.createElement("ul")
        this.tagSelector.appendChild(this.tagSelectorList);
        
        document.body.appendChild(this.tagSelector);
        $('.tagSelector').hover(function() { 
          $(this).addClass('hovered');
        }, function() {
          $(this).removeClass('hovered');
        });
    },

    /**
     * Set all the properties. Called in the constructor.
     */
    setAll: function () {
        this.reset();

        this.system_selected = []
        this.colorMethod = "Tag";
        this.changeNotation("percent", false)
        this.changeTimeFormat("name", false)
        this.top = 50;
    },
    /**
     * remove all elements from the previous .vidjil file but keep current user parameters and linked views
     * */
    reset: function () {
        this.analysis = {
            clones: [],
            clusters: [],
            date: []
        };

        this.orderedSelectedClones=[];
        this.clusters = [];
        this.clusters_copy = [];
        this.clones = [];
        this.data = {}; // external data
        this.data_info = {};
        this.clone_info = -1;
        this.someClonesFiltered = false;

        this.t = 0;          // Selected time/sample
        this.tOther = 0;  // Other (previously) selected time/sample
        this.focus = -1;


        this.display_window = false
        this.isPlaying = false;

        this.mapID = {};
        this.precision = 1;

        this.germlineV = new Germline(this)
        this.germlineD = new Germline(this)
        this.germlineJ = new Germline(this)
        
        this.dataFileName = '';
        this.analysisFileName = '';
        this.db_key = "" //for file who came from the database
        this.cloneNotationType="short_sequence";
        this.alleleNotation = "when_not_01";

        this.norm = false;
        this.normalization = { 
            "method" : "constant",
            "size_list" : [],
            "expected_size" : 0,
            "id" : -1
        };
        this.normalization_list=[]
        /*Variables pour DBSCAN*/
        this.eps = 0;
        this.nbr = 0;
        this.nodes = null;
        this.edges = null;
        
        //segmented status
        this.segmented_mesg = ["?", 
            "SEG_+", 
            "SEG_-", 
            "UNSEG too short", 
            "UNSEG strand",  
            "UNSEG too few (zero)", 
            "UNSEG too few V", 
            "UNSEG too few J",
            "UNSEG < delta_min", 
            "UNSEG > delta_max",
            "UNSEG ambiguous",
            "= SEG, with window",
            "= SEG, but no window",
        ];

        this.tag = [
            {"color" : "#dc322f", "name" : "clone 1", "display" : true},
            {"color" : "#cb4b16", "name" : "clone 2", "display" : true},
            {"color" : "#b58900", "name" : "clone 3", "display" : true},
            {"color" : "#268bd2", "name" : "standard", "display" : true},
            {"color" : "#6c71c4", "name" : "standard (noise)", "display" : true},
            {"color" : "#2aa198", "name" : "custom 1", "display" : true},
            {"color" : "#d33682", "name" : "custom 2", "display" : true},
            {"color" : "#859900", "name" : "custom 3", "display" : true},
            {"color" : "", "name" : "-/-", "display" : true}
        ]

        this.default_tag=8;

        for (var i = 0; i < this.view.length; i++) {
            this.view[i].reset();
        }
        
    },
    
    
    create_germline_obj: function() {
        for (var locus in germline){
            germl = locus.substring(0,3)
            if (typeof this.germline[germl]==="undefined") {
             this.germline[germl]={};
            }
            for (var allele in germline[locus]) {
                    this.germline[germl][allele]="";
                    this.germline [germl][allele]+=germline[locus][allele];
                    }
                }


        return this.germline;
    },
    
    /**
     * load a germline / attribute a color for each genes / and compute some info
     * @param {string} [system=current_system] system name ('TRG'/'IGH'), see germline.js for a list of available germlines 
     * */
    loadGermline: function (system) {
        console.log("loadGermline : " + system)
        system = typeof system !== 'undefined' ? system : this.system;
        if (system == "multi" || typeof system == 'undefined'){
            system = this.system_available[0]
            var max = 0;
            for (var i=0; i<this.clones.length; i++){
                var clone_size = this.clone(i).getSize()
                var clone_system = this.clone(i).get('germline')
                if (clone_size>max && typeof clone_system != "undefined"){
                    max = clone_size
                    system = clone_system
                }
            }
        }
        
        return  this.germlineV.load(system, "V", this)
                    .germlineD.load(system, "D", this)
                    .germlineJ.load(system, "J", this)
                    
    }, //end loadGermline

    /**
     * compute some meta-data for each clones
     * */
    initClones: function () {
        console.log("initClones()");

        // time_type to name_short if there is many samples
        if (this.samples.order.length > 6)
            this.changeTimeFormat("short_name", false)

        // time_type to delta_date if we have enough different dates
        deltas = this.dateDiffMinMax()
        if (deltas.max > 1)
            this.changeTimeFormat("delta_date", false)
        
        //      NSIZE
        var n_max = 0;
        var clone;
        for (var i = 0; i < this.clones.length; i++) {
            clone = this.clone(i)
            var n = clone.getNlength();
            if (n > n_max) {n_max = n; }
        }
        this.n_max = n_max
        
        //      COLOR_N
        for (var j = 0; j < this.clones.length; j++) {
            clone = this.clone(j)
            clone.colorN = colorGenerator((((clone.getNlength() / n_max) - 1) * (-250)));
            clone.tag = this.default_tag;
        }
        
        this.applyAnalysis(this.analysis);
        this.initData();
    }, //end initClones

changeCloneNotation: function(cloneNotationType) {
    this.cloneNotationType = cloneNotationType;
    this.update();
},


changeAlleleNotation: function(alleleNotation) {
    this.alleleNotation = alleleNotation;
    this.update();
},
    
    /**
     * compute data_info who contain some meta-data for each "data"
     * */
    initData: function () {
        this.data_info = {}
        var i=1;
        for (var key in this.data){
            if (this.data[key].length == this.samples.number){
                this.data_info[key] = {
                    "color" : this.tag[i].color,
                    "isActive" : false
                }
                i++
            }
        }
    },
    
    /**
     * complete some clones with informations found in the analysis file (tag / name / expected value)
     * @param {object} analysis / json content of .analysis file
     * */
    applyAnalysis: function (analysis) {
        
        this.analysis_clones = []   // will store unused clones analysis
        
        if (this.analysis.vidjil_json_version != 'undefined' && this.analysis.vidjil_json_version >= VIDJIL_JSON_VERSION){
            var c = analysis.clones
            
            //      CUSTOM TAG / NAME
            //      EXPECTED VALUE
            var max = {"id" : -1 , "size" : 0 }     //store biggest expected value ( will be used for normalization)
            for (var i = 0; i < c.length; i++) {
                
                var id = -1
                var f = 1;
                //check if we have a clone with a similar id
                if (typeof c[i].id != "undefined" && typeof this.mapID[c[i].id] != "undefined") {
                    id = this.mapID[c[i].id]
                }
                
                //check if we have a window who can match the sequence
                if (typeof c[i].sequence != "undefined" && id == -1) {
                    id = this.findWindow(c[i].sequence);
                }
                
                if (id != -1){
                    var clone = this.clone(id)
                    
                    if (typeof c[i].expected != "undefined") {
                        clone.expected = c[i].expected
                        f = clone.getSize() / c[i].expected;
                        
                        if (f < 100 && f > 0.01) {
                            if (typeof (c[i].tag) != "undefined") {
                                clone.tag = c[i].tag;
                            }

                            if (typeof (c[i].name) != "undefined") {
                                clone.c_name = c[i].name;
                            }
                            
                            if (c[i].expected>max.size){
                                max.size = c[i].expected
                                max.id = id
                            }
                        }else{
                            console.log(" apply analysis : clones "+ c[i].id + " > incorrect expected value", 0)
                        }
                    }else{
                        if (typeof (c[i].tag) != "undefined") {
                            clone.tag = c[i].tag;
                        }
                        if (typeof (c[i].name) != "undefined") {
                            clone.c_name = c[i].name;
                        }
                    }
                }else{
                    this.analysis_clones.push(c[i])
                }
            }
            this.loadCluster(analysis.clusters)
        }
        this.init()
    },
    
    /**
     * merge clones together using a list of clones to be merged
     * @param {integer[]} clusters - an array of list of clone_id
     * */
    loadCluster: function (clusters) {

    this.analysis_clusters = [] // will store unused clusters analysis
    
	if (typeof (clusters) == 'undefined')
	    return ;

        for (var i = 0; i < clusters.length; i++) {

            var new_cluster = [];
            var tmp = [];
            
            for (var j=0; j<clusters[i].length;j++){
                if (typeof this.mapID[clusters[i][j]] != 'undefined'){
                    var cloneID = this.mapID[clusters[i][j]]
                    new_cluster = new_cluster.concat(this.clusters[cloneID]);
                    this.clusters[cloneID] = [];
                }else{
                    tmp.push(clusters[i][j])
                }
            }
            
            if (new_cluster.length !== 0){
                var l = new_cluster[0]
                for (var k=0; k<new_cluster.length;k++){
                    if (this.clone(new_cluster[k]).top < this.clone(l).top) l = new_cluster[k]
                }
                this.clusters[l] = new_cluster;
                
                if (tmp.length !== 0){
                    tmp.push(this.clone(l).id)
                    this.analysis_clusters.push(tmp);
                }
                
            }else{
                
                if (tmp.length !== 0){
                    this.analysis_clusters.push(tmp);
                }
            }
        }
    },

    /**
     * search in the clone list, a clone who share his window with the given sequence.
     * @param {string} sequence
     * @return {integer} clone_id - index of the clone in the clone list (or -1 if not found)
     * */
    findWindow: function (sequence) {
        if (sequence !== 0){
            for ( var i=0; i<this.clones.length; i++ ){
                if ( sequence.indexOf(this.clone(i).id) != -1 ) return i
            }
        }
        return -1
    },

    /**
     * return the given time index if exist, or the one currently used as default
     * @return {integer} time - time index 
     * */
    getTime: function(time) {
        return typeof time !== 'undefined' ? time : this.t
    },

    /**
     * return a name that can be displayed gracefully <br>
     * (either with a real filename, or a name coming from the database).
     * @return {string} filename - clean analysis filename
     * */
    getPrintableAnalysisName : function() {
        var ext = this.dataFileName.lastIndexOf(".")
        if (ext > 0) {
            return this.dataFileName.substr(0, ext)
        } else {
            return this.dataFileName
        }
    },
    
    /**
     * return date of a timepoint given a time/sample index 
     * @return {string} timestamp - sample date
     * */
    getSampleTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var value = "–"
        if (typeof this.samples.timestamp != 'undefined'){
            if (typeof this.samples.timestamp[time] != 'undefined'){
                value = this.samples.timestamp[time]
            } 
        }
        return value;
    },
    
    /**
     * return name of the soft used to produce sample result given a time/sample index 
     * @return {string} soft - name of the software used 
     * */
    getSoftVersionTime: function(time) { 
        time = typeof time !== 'undefined' ? time : this.t
        var soft_version = "–"
        if (typeof this.samples.producer != 'undefined')
            soft_version = this.samples.producer[time]
        return soft_version;
    },

    /**
     * return commandline used to produce sample result given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getCommandTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var command = "–"
        if (typeof this.samples.commandline != 'undefined')
            command = this.samples.commandline[time]
        return command;
    },

    getDiversity: function(key, time) {
	time = typeof time !== 'undefined' ? time : this.t
	if (typeof this.diversity != 'undefined' &&
	    typeof this.diversity[key] != 'undefined') {

	    // Diversity may not be stored in an Array for retrocompatiblitiy reasons
	    // See #1941 and #3416
	    if (typeof this.diversity[key][time] != 'undefined') {
		return this.diversity[key][time].toFixed(3);
	    } else {
		return this.diversity[key].toFixed(3);
	    }
	}
    },
    
    /**
     * return date of software run given a time/sample index <br>
     * @return {string} command - sample command
     * */
    getTimestampTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var timestamp = "–"
        if (typeof this.samples.run_timestamp != 'undefined')
            timestamp = this.samples.run_timestamp[time]
        return timestamp
    },

    getInfoTime: function(time) {
        time = typeof time !== 'undefined' ? time : this.t
        var info = "-"
        if (typeof this.samples.info != 'undefined' && this.samples.info !== null)
            info = this.samples.info[time]
        return info
    },

    /**
     * return the soft version used to produce all samples results <br>
     * return "multiple" if different soft have been used for different samples
     * @return {string} software - name of the software used 
     * */
    getSoftVersion: function() {
        if (typeof this.samples.producer == "undefined"){
            return "–"
        }else{
            var soft_version = this.samples.producer[this.samples.order[0]]
            for (var i=1; i<this.samples.order.length; i++){
                if (soft_version != this.samples.producer[this.samples.order[i]])
                    return "multiple softwares/versions"
            }
            return soft_version
        }
    },

    /**
     * Keep only one system activated, the one given as a parameter
     * @param {string} system - system string id
     * */
    keep_one_active_system: function (system) {
        this.system_selected = [system]
        this.update_selected_system()
    },

    /**
     * Toggle all system on (if the parameter is true) or off (otherwise)
     * @param {bool} is_on 
     * */
    toggle_all_systems: function(is_on) {
        if (is_on) {
            this.system_selected = this.system_available.slice()
        } else {
            this.system_selected = []
        }
        this.update_selected_system()
    },
    
    /**
     * Toggle the selected system
     * */
    toggle_system: function(system){
        if (this.system_available.indexOf(system) != -1) {
            var pos = this.system_selected.indexOf(system) 
            if (pos== -1){ this.system_selected.push(system) }
            else{ this.system_selected.splice(pos, 1) }
        }
        this.update_selected_system()
    },
    
    /**
     * compute the number of reads segmented for the current selected system(s)
     * */
    update_selected_system: function(){
        //reset reads.segmented
        for (var h=0 ; h<this.reads.segmented.length; h++){
            this.reads.segmented[h]=0
        }

        //compute new reads.segmented value (sum of reads.segmented of selected system)
        for (var i=0; i<this.system_selected.length; i++){
            var key = this.system_selected[i]
            for (var j=0; j<this.reads.segmented.length; j++){
                this.reads.segmented[j] += this.reads.germline[key][j]
            }
        }
        
        this.updateModel()
        //check if current germline is in the selected_system
        if (this.system_selected.indexOf(this.germlineV.system) == -1 && this.system_selected.length > 0){
            this.changeGermline(this.system_selected[0], false)
        }else{
            this.update()
        }
    },
    
    /**
     * normalize a size to match the normalization done on a given time/sample
     * normalization is done when update is 
     * @param {float} original_size - size before normalization
     * @param {integer} time - time/sample index of the timepoint where happen the normalization
     * @return {float} normalized_size - size after normalization
     * */
    normalize: function (original_size, time) {
        var normalized_size = 0;
        
        if (this.normalization.size_list.length !== 0 && this.normalization.size_list[time] !== 0) {
            var A = this.normalization.size_list[time] /* standard/spike at point time */
            var B = this.normalization.expected_size       /* standard/spike expected value */
            normalized_size = (original_size * B) / A           
        }else{
            normalized_size = original_size
        }
        
        return normalized_size
    },

    /**
     * compute normalization factor needed to give a clone an expected size
     * @param {integer} cloneID - index of the clone used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
     * */
    compute_normalization: function (cloneID, expected_size) {
        if (cloneID==-1){ 
            this.norm = false
            expected_size = 0;
            this.normalization.id = cloneID
        }else{
            this.norm = true
            expected_size = typeof expected_size !== 'undefined' ? expected_size : this.clone(cloneID).expected;
            
            this.normalization.size_list = []
            this.normalization.expected_size = expected_size
            this.normalization.id = cloneID
            this.normalization.type = "clone"
            
            var tmp = this.norm
            this.norm = false
            
            for (var i=0; i<this.samples.number; i++){
                this.normalization.size_list[i] = this.clone(cloneID).getSize(i)
            }
            
            this.norm = tmp
        norm_hash = jQuery.extend(true, {}, this.normalization)     
        this.normalization_list.push(norm_hash)
    
        }
    },
    
    /**
     * compute normalization factor needed to give a data an expected size
     * first function called when normalization button is clicked
     * @param {integer} data - index of the data used as pivot for normalization
     * @param {float} expected_size - the size the should have the clone after normalization
     * */
    compute_data_normalization: function (data, expected_size) {
        expected_size = typeof expected_size !== 'undefined' ? expected_size : this.data[data].expected;
        this.norm = true
        
        this.normalization.size_list = []
        this.normalization.expected_size = expected_size
        this.normalization.id = data
        this.data[data].expected = expected_size
        
        for (var i=0; i<this.samples.number; i++){
            this.normalization.size_list[i] = this.data[data][i]
        }
         norm_hash = jQuery.extend(true, {}, this.normalization)
        this.normalization_list.push(norm_hash)
    },
    
    /**
     * compute the last normalization again <br>
     * clones sizes can change depending the parameters so it's neccesary to recompute normalization from time to time
     * */
    update_normalization: function () {
        if ((this.normalization.expected_size !== 0 && this.normalization.type=="clone" )) {
            this.compute_normalization( this.normalization.id, this.normalization.expected_size);
        }
    },
    
    /**
     * compute min/max clones sizes and abundance color scale<br>
     * clone size can change depending the parameter so it's neccesary to recompute precision from time to time
     * */
    update_precision: function () {
        var min_size = 1
        var max
        for (var i=0; i<this.samples.order.length; i++){
            var t = this.samples.order[i]
            var size = this.min_sizes[t]
            if (this.norm) size = this.normalize(this.min_sizes[t], t) 
            if (size < min_size) min_size = size
        }
        
        this.max_size = 1
        this.min_size = min_size
        if (this.norm){
            for (var j=0; j<this.samples.order.length; j++){
                if(this.normalization.size_list[j]==0){
                max = this.normalization.expected_size
                }else{
                max = this.normalization.expected_size/this.normalization.size_list[j]
                }
                if (max>this.max_size) this.max_size=max;
            }
        }
        
        //*2 pour avoir une marge minimum d'un demi-log
        // 1/0 == infinity
        this.precision=(1/this.min_size)*2
        
        this.scale_color = d3.scale.log()
            .domain([1, this.precision])
            .range([250, 0]);
    },

    /**
     * return log of a given sample (if exist) 
     * @param {integer} timeID - time/sample index
     * */
    getSegmentationInfo: function (timeID) {
        if (typeof this.samples.log != 'undefined'){
            return this.samples.log[timeID].replace(/(?:\r\n|\r|\n)/g, '<br />')
        }else{
            return "not specified";
        }
    },

    /**
     * put a marker on a specific clone
     * @param {integer} cloneID - index of the clone to focus 
     * */
    focusIn: function (cloneID) {
        var tmp = this.focus;

        if (tmp != cloneID) {
            this.focus = cloneID;
            if (tmp != -1) {
                this.updateElemStyle([cloneID, tmp]);
            } else {
                this.updateElemStyle([cloneID]);
            }
        }

        $(".focus")
            .text(this.clone(cloneID).getNameAndCode())

    },


    /**
     * release the current focused clone
     * */
    focusOut: function () {
        var tmp = this.focus;
        this.focus = -1;
        if (tmp != -1) this.updateElemStyle([tmp]);
        $(".focus")
            .text("")
    },

    /**
     * return clones currently in the selection
     * @return {integer[]} clone_list - array of clone index
     * */
    getSelected: function () {
        var result = []
        for (var i = 0; i < this.clones.length; i++) {
            if (this.clone(i).isSelected()) {
                result.push(i);
            }
        }
        return result
    },

    /**
     * put a clone in the selection
     * @param {integer} - cloneID - index of the clone to add to the selection
     * */
    select: function (cloneID) {
        console.log("select() (clone " + cloneID + ")");

        // others shouldn't be selectable
        if (this.clones[cloneID].isVirtual()) {
            return 0;
        }

        if (!this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = true;
            this.orderedSelectedClones.push(cloneID);

            this.updateElemStyle([cloneID]);
        }
    },

    /**
     * Unselect an isolated clone
     * @param {integer} - cloneID - index of the clone to remove from the selection
     */
    unselect: function(cloneID) {
        console.log("unselect() (clone " + cloneID + ")");
        if (this.clones[cloneID].isVirtual()) {
            return 0;
        }

        if (this.clone(cloneID).isSelected()) {
            var index = this.orderedSelectedClones.indexOf(cloneID);
            if (index > -1)
                this.orderedSelectedClones.splice(index, 1);
            this.clone(cloneID).select = false;
            this.updateElemStyle([cloneID]);
        }
        console.log("orderedSelectedClones: " + this.orderedSelectedClones.join(","));
    },

    toggleSelect: function(cloneID) {
        console.log("toggle() (clone " + cloneID + ")");

        // others shouldn't be selectable
        if (this.clones[cloneID].isVirtual()) {
            return 0;
        }

        if (this.clone(cloneID).isSelected()) {
            this.clone(cloneID).select = false;
            this.removeFromOrderedSelectedClones(cloneID);
        } else {
            this.clone(cloneID).select = true;
            this.orderedSelectedClones.push(cloneID);
        }
        
        this.updateElemStyle([cloneID]);
    },
    
    /**
     * put clones who match the description in the selection
     * @param {Array} - desc
     * */
    selectBy: function (desc) {
        for (var i=0; i<this.clones.length; i++){
            var clone = this.clone(i);
            var select = true;
            for (var key in desc) {
                select = (select && (clone.get(key) == desc[key]))
            }
            clone.select = select;
        }
        this.updateStyle();
    },


    /**
     * select clones correlated to a given clone
     * @param {integer} - cloneID - index of the reference clone
     */
    selectCorrelated: function(ref, threshold) {

        if (typeof threshold === "undefined") {
            threshold = 0.95
        }

        refReads = this.clone(ref).getReadsAllSamples(logadd1)

        for (var i=0; i<this.clones.length; i++){
            var clone = this.clone(i);
            var coeff = pearsonCoeff(refReads, clone.getReadsAllSamples(logadd1))
            clone.select = (Math.abs(coeff) > threshold)
        }
        this.updateStyle();
    },

    
    /**
     * put a list of clones in the selection
     * @param {integer[]} - list - array of clone index
     * */
    multiSelect: function (list) {

        console.log("select() (clone " + list + ")");

        var tmp = []
        for (var i = 0; i < list.length; i++) {
            tmp[i] = {'id': list[i], 'size': this.clone(list[i]).getSize()}
        }

        list = []
        tmp = tmp.sort(function (a, b) {
            if (a.size < b.size) return 1;
            return -1;
        })

        for (var j = 0; j < tmp.length; j++) {
            this.clone(tmp[j].id).select = true;
            this.orderedSelectedClones.push(tmp[j].id);
            list[j] = tmp[j].id
        }

        this.updateElemStyle(list);
        this.update();
    },

    /**
     * select all clones
     * */
    selectAll: function () {
        for (var i=0; i<this.clones.length; i++){
            this.clone(i).select = true;
        }
        this.updateStyle();
    },

    /**
     * kick all clones out of the selection
     * */
    unselectAll: function () {
        console.log("unselectAll()");
        this.orderedSelectedClones = [];
        var list = this.getSelected();
        for (var i = 0; i < list.length; i++) {
            this.clone(list[i]).select = false;
        }
        this.updateElemStyle(list);
    },

    unselectAllUnlessKey: function (e) {
        if (!(e.ctrlKey || e.altKey || e.metaKey)) this.unselectAll()
    },

    /**
     * Remove an item from the selected Clones list
     */
    removeFromOrderedSelectedClones: function (cloneID){

        if (this.orderedSelectedClones!==null){
            var pos=this.orderedSelectedClones.indexOf(cloneID);
            if (pos>-1){
                this.orderedSelectedClones.splice(pos,1);
            }
        }
    },


    /**
     * ask all linked views to do a resize
     * @param {integer} [speed] - speed of the resize used by views able to do a transition
     * */
    resize: function (speed) {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].resize(speed);
        }
        
        return this
    },


    /**
     * enable/disable clones using the current model state <br>
     * recompute the clone 'other' size <br>
     * update clones colors
     * */
    updateModel: function () {

        this.someClonesFiltered = false

        for (var i = 0; i < this.clusters.length; i++) {
            // compute only non empty clones
            var seq;
            if (this.clusters[i].length !== 0) {
                if (!this.clone(i).split) {
                    for (var j = 0; j < this.clusters[i].length; j++) {
                        seq = this.clusters[i][j]
                        var subclone = this.clone(seq);
                        subclone.disable();
                        if (seq != i && subclone.isSelected())
                            // Unselect all subclones
                            this.unselect(seq);
                    }
                    this.clone(i).enable(this.top)
                } else {
                    var main_clone = this.clone(i);
                    for (var k = 0; k < this.clusters[i].length; k++) {
                        seq = this.clusters[i][k]
                        var clone = this.clone(seq);
                        clone.enable(this.top)
                        if (clone.isSelected() != main_clone.isSelected())
                            this.select(seq, main_clone.select);
                    }
                }
            }
        }
        
        // unactive clones from unselected system
        if (this.system == "multi") {
            for (var l = 0; l < this.clones.length; l++) {
                if (this.system_selected.indexOf(this.clone(l).get('germline')) == -1) {
                    this.clones[l].disable()
                    this.someClonesFiltered = true
                }
            }
        }
        
        //unactive filtered clone
        for (var m = 0; m < this.clones.length; m++) {
            if (this.clone(m).isFiltered) {
                this.clone(m).disable();
                this.someClonesFiltered = true
            }
        }
        
        this.computeOtherSize();

        for (var n = 0; n < this.clones.length; n++) {
            this.clone(n).updateColor()
        }
        // update icon if normalisation is setup 
        if(this.norm){
        $("i.icon-lock-1").toggleClass('icon-lock-1 icon-star-2')
        $("#"+this.normalization.id+" i.icon-star-2").toggleClass('icon-star-2 icon-lock-1')
        $("#f"+this.normalization.id+" i.icon-star-2").toggleClass('icon-star-2 icon-lock-1')     
           }else{
            $("i.icon-lock-1").toggleClass('icon-lock-1 icon-star-2') 
            // $("#f"+this.normalization.id+" i.icon-star-2").toggleClass('icon-lock-1 icon-star-2')
           }

    },

    /**
     * ask all linked views to do a complete update <br>
     * this function must be call for major change in the model
     * */
    update: function () {
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        this.update_normalization();
        this.update_precision();
        this.updateModel();

        for (var i = 0; i < this.view.length; i++) {
            this.view[i].update();
        }
        
        elapsedTime = new Date()
            .getTime() - startTime;
        console.log("update(): " + elapsedTime + "ms");
    },


    /**
     * ask all linked views to update a clone list
     * @param {integer[]} - list - array of clone index
     * */
    updateElem: function (list) {
        if ( list.indexOf(this.normalization.id) != -1 ){
            this.update_normalization()
            this.update_precision()
        }
        this.updateModel()
        
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElem(list);
        }
    },

    /**
     * ask all linked views to update the style of a clone list
     * @param {integer[]} - list - array of clone index
     * */
    updateElemStyle: function (list) {
        this.updateModel();
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].updateElemStyle(list);
        }
    },
    
    /**
     * ask all linked views to update the style of all clones
     * */
    updateStyle: function () {
        var list = []
        for (var i=0; i<this.clones.length; i++) list[i]=i
        for (var j = 0; j < this.view.length; j++) {
            this.view[j].updateElemStyle(list);
        }
        this.updateModel()
    },

    /**
     * ask all linked views to init <br>
     * reset the display limit
     * */
    init: function () {
        for (var i = 0; i < this.view.length; i++) {
            this.view[i].init();
        }

        var count = 0;
        for (var j = 0; j < this.clones.length; j++) {
            if (this.clone(j).isActive()) count++
        }
        
        this.resize();

        if (typeof this.url_manager !== "undefined") {
            this.url_manager.applyURL();
        }

        this.displayTop();
    },


    /**
     * define a minimum top rank required for a clone to be displayed
     * @param {integer} top - minimum rank required to display
     * */
    displayTop: function (top) {
        top = typeof top !== 'undefined' ? top : this.top;
        if (top < 0)
            top = 0
        if (top > this.countRealClones())
            top = this.countRealClones()

        this.top = top;

        var html_slider = document.getElementById('top_slider');
        if (html_slider !== null) {
            html_slider.value = top;
        }
        
        var html_label = document.getElementById('top_label');
        if (html_label !== null) {
            var count = 0;
            for (var i=0; i<this.clones.length; i++){
                if (this.clone(i).top < top) count++;
            }
            html_label.innerHTML = count + ' clones (top ' + top + ')' ;
        }
        
        this.update();
    },

    /**
     * @return {integer} the number of real clones (excluded the fake clones internally
     * added)
     * */
    countRealClones: function() {
        return this.clones.length - this.system_available.length;
    },

    /**
     * sum all the unsegmented/undisplayed clones reads and put them in the 'other' clone
     * */
    computeOtherSize: function () {
        var newOthers = {};

        // Creation of newOthers dict by germlines & timestamp
        for (var elt in this.system_available){
            var locus = this.system_available[elt];
            newOthers[locus] = [];
            for (var sample = 0; sample < this.samples.number; sample++) {
                newOthers[locus][sample] = this.reads.germline[locus][sample];
                }
        }

        // compute size for each germlines of newOthers
        other_quantifiable_clones = [];
        for (var pos = 0; pos < this.clones.length; pos++) {
            var c = this.clone(pos)
            if (c.isVirtual()) {
                other_quantifiable_clones.push(pos);
            } else if (c.isActive() && c.quantifiable) {
                for (var s = 0; s < this.samples.number ; s++) {
                    for (var k = 0; k < this.clusters[pos].length; k++) {
                        newOthers[c.germline][s] -= this.clone(this.clusters[pos][k]).get('reads', s);
                    }
                }
            }
        }

        // values assignation of other
        //for (var pos = this.clones.length -lenSA; pos < this.clones.length ; pos++) {
        var self = this;
        other_quantifiable_clones.forEach(function(pos) {
            var c = self.clone(pos);
            c.reads = newOthers[c.germline];
            c.name = c.germline + " smaller clones";
            if (self.someClonesFiltered)
                c.name += " + filtered clones";
        })
    },
    
    /**
     * return info about a timePoint in html 
     * @param {integer} timeID - time/sample index
     * @return {string} html 
     * */
    getPointHtmlInfo: function (timeID) {
        var html = ""

        html = "<h2>Sample " + this.getStrTime(timeID, "name") + " ("+ this.getSampleTime(timeID)+")</h2>"
        html += "<div id='info_timepoint'><table><tr><th></th>"
        html += "<tr><td> reads </td><td>" + this.reads.total[timeID] + "</td></tr>"
        html += "<tr><td> analyzed reads </td><td>" + this.reads.segmented_all[timeID] +
            " ("+ (this.reads.segmented_all[timeID]*100/this.reads.total[timeID]).toFixed(3) + " % )</td></tr>"

        html += "<tr><td> analysis software </td><td>" + this.getSoftVersionTime(timeID) + "</td></tr>"
        html += "<tr><td> parameters </td><td>" + this.getCommandTime(timeID) + "</td></tr>"
        html += "<tr><td> timestamp </td><td>" + this.getTimestampTime(timeID) + "</td></tr>"
        html += "<tr><td> analysis log </td><td><pre>" + this.getSegmentationInfo(timeID) + "</pre></td></tr>"

        if ( typeof this.diversity != 'undefined') {
            html += "<tr><td class='header' colspan='2'> diversity </td></tr>"
            for (var key in this.diversity) {
                html += "<tr><td> " + key.replace('index_', '') + "</td><td>" + this.getDiversity(key, timeID) + '</td></tr>'
            }
        }

        if ( typeof this.samples.diversity != 'undefined' && typeof this.samples.diversity[timeID] != 'undefined') {
            html += "<tr><td class='header' colspan='2'> diversity </td></tr>"
            for (var k in this.samples.diversity[timeID]) {
                html += "<tr><td> " + k.replace('index_', '') + "</td><td>" + this.samples.diversity[timeID][k].toFixed(3) + '</td></tr>'
            }
        }

        html += "</table></div>"
        return html
    },


////////////////////////////////////
//// clusters functions
////////////////////////////////////
    
    /**
     * merge all clones currently in the selection into one cluster
     * */
    merge: function (list) {
        var select_lead = false;
        if (list===undefined){
            list = this.getSelected();
            select_lead = true;
        } 

        if (list.length === 0)
            return ;
        
        var new_cluster = [];
        var leader;
        var top = 200;
        
        console.log("merge clones " + list)

        this.saveClusters()

        for (var i = 0; i < list.length; i++) {
            if (this.clone(list[i]).top < top) {
                leader = list[i];
                top = this.clone(list[i]).top;
            }
            new_cluster = new_cluster.concat(this.clusters[list[i]]);

            // All cluster lists of these clones are now empty...
            this.clusters[list[i]] = [];
        }

        // ... except for the leader, who takes the list of all clones
        this.clusters[leader] = new_cluster;
        this.unselectAll()
        this.updateElem(list)
        if (select_lead) this.select(leader)
        
        this.analysisHasChanged = true
    },


    /**
     * remove a clone from a cluster
     * @param {integer} clusterID - cluster index
     * @param {integer} cloneID - clone index
     * */
    split: function (clusterID, cloneID) {
        console.log("split() (cloneA " + clusterID + " windowB " + cloneID + ")")
        if (clusterID == cloneID) return

        var nlist = this.clusters[clusterID];
        var index = nlist.indexOf(cloneID);
        if (index == -1) return

        nlist.splice(index, 1);

        this.saveClusters()

        // The cluster has now a list with one less clone
        this.clusters[clusterID] = nlist;
        if (this.clusters[clusterID].length <= 1) this.clone(clusterID).split = false;

        // The unmerged clone has now its own 1-clone cluster
        this.clusters[cloneID] = [cloneID];

        this.updateElem([cloneID, clusterID]);
    },
    
    /** 
     * cluster clones who produce the same result with the function given in parameter <br>
     * @param {function} fct 
     * */
    clusterBy: function (fct) {
        var self = this;
        
        this.saveClusters()
        
        var tmp = {}
        for (var i = 0; i < this.clones.length - this.system_available.length; i++) {

            //detect key value
            var key = "undefined"

            key = fct(i)

            //store clones with same key together
            if (key === "") key = "undefined"
            if (tmp[key]) {
                tmp[key].push(i)
            } else {
                tmp[key] = [i]
            }

        }

        //order clones with same key
        var keys = Object.keys(tmp)
        var compare = function(a, b) {
            return self.clone(a).top - self.clone(b).top;
        }
        for (var j in tmp) {
            tmp[j].sort(compare);
        }

        //reset cluster
        for (var k = 0; k < this.clones.length; k++) {
            this.clusters[k] = []
        }

        //new cluster
        for (var l in tmp) {
            this.clusters[tmp[l][0]] = tmp[l]
            this.clusters[tmp[l][0]].name = l

            for (var m = 1; j < tmp[l].length; j++) {
                this.clusters[tmp[l][m]] = []
            }
        }
        this.update()
    },

    /**
     * break the given clusters into 1-clone clusters
     * @param {integer list} clusters
     * */
    break: function (clusters) {
        console.log("break(" + clusters+ ")")

        if (clusters === undefined)
            clusters = this.getSelected();

        console.log("break(" + clusters+ ")")

        this.saveClusters()

        for (var i = 0; i < clusters.length; i++) {
            var list = this.clusters[clusters[i]]

            console.log("b " + list)

            for (var j = 0; j < list.length; j++) {
                this.clusters[list[j]] = [list[j]]
            }

            this.updateElem(list);
        }
    },

    /**
     * break all clusters to default 1-clone clusters
     * */
    resetClusters: function () {
        this.saveClusters()

        for (var i = 0; i < this.clones.length; i++) {
            this.clusters[i] = [i]
        }

        this.update()
    },


    /**
     * save clusters
     * */
    saveClusters: function () {
        var l = this.clusters_copy.push(this.clusters.slice())

        if (l > 20)
            this.clusters_copy.shift()
    },

    /**
     * restore previously saved clusters
     * */
    restoreClusters: function () {
        if (this.clusters_copy.length > 0){
            this.clusters = this.clusters_copy.pop()
            this.update()
        }
        
    },

////////////////////////////////////
//// time functions
////////////////////////////////////
    
    /** 
     * change the current tracking point used
     * @param {integer} newT - time/sample index to use
     * */
    changeTime: function (newT) {
        console.log("changeTime()" + newT)
        this.tOther = this.t
        this.t = newT;
        this.update();
        return this.t
    },
    
    /**
     * exchange position of 2 timepoints
     * @param {integer} a - time/sample index
     * @param {integer} b - time/sample index
     * */
    switchTimeOrder: function (a, b) {
        var tmp = this.samples.order[a];
        this.samples.order[a] = this.samples.order[b]
        this.samples.order[b] = tmp;
        this.update()
    },
    
    /**
     * replace the current time order with a new one
     * @param {integer[]} list - list of time/sample index
     * */
    changeTimeOrder: function (list) {
        this.samples.order = list
        this.update()
    },
    
    /**
     * change timepoint for the next one in the current displayed time_order 
     * */
    nextTime: function () {
        var current_pos = this.samples.order.indexOf(this.t)
        
        if (current_pos != -1){
            if (current_pos+1 < this.samples.order.length){
                //next one
                return this.changeTime(this.samples.order[current_pos+1])
            }else{
                //back to the beginning
                return this.changeTime(this.samples.order[0])
            }
        }else{
            return this.changeTime(this.samples.order[0])   
        }
    },
    
    /**
     * change timepoint for the previous one in the current displayed time_order 
     * */
    previousTime: function (){
        var current_pos = this.samples.order.indexOf(this.t)
        
        if (current_pos != -1){
            if (current_pos === 0){
                //teleport to the end
                return this.changeTime(this.samples.order[this.samples.order.length-1])
            }else{
                //previous one
                return this.changeTime(this.samples.order[current_pos-1])
            }
        }else{
            return this.changeTime(this.samples.order[0])   
        }
        
    },
    
    /**
     * recursive function calling nexTime() till encounter the specified timePoint 
     * @param {integer} stop - time/sample index
     * */
    play: function (stop) {
        var self = this;
        this.isPlaying = true;
        this.nextTime();
        
        //check if "stop" is still in time_order and replace it if necessary
        if (this.samples.order.indexOf(stop)==-1) stop = this.samples.order[0]
        
        //continue until stop
        if (this.t != stop) { 
            setTimeout(function(){
                if (self.isPlaying) self.play(stop)
            },3000);
        }else{
            this.isPlaying = false
            setTimeout(function(){ 
                self.update()
            },1000);
        }
    },

    /** 
     * break recursive play()
     * */
    stop: function (){ 
        this.isPlaying = false;
        this.update();
    },
    
    /**
     * return the number of days between two date
     * @param {string} aa - timestamp a
     * @param {string} bb - timestamp b
     * @return {integer} days
     * */
    dateDiffInDays: function(aa, bb) {
        // inspired by http://stackoverflow.com/questions/3224834
        var _MS_PER_DAY = 1000 * 60 * 60 * 24 ;
        var a = new Date(aa.split(" ")[0]+"T00:00:00.00Z");
        var b = new Date(bb.split(" ")[0]+"T00:00:00.00Z");

        // Discard the time and time-zone information.
        var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        
        return Math.floor((utc2 - utc1) / _MS_PER_DAY);
    },

    /**
     * return the min/max number of days between two consecutive timepoints
     * @return {{min : number, max : number}} days
     * */
    dateDiffMinMax: function () {
        // Computes the min and max delta between timepoints
        
        delta_min = 9999
        delta_max = 0

        for (var i = 0; i < this.samples.order.length; i++)
	    if ((typeof this.samples.timestamp == 'undefined') || (this.samples.timestamp[i] == 'None'))
		return { 'min': -1, 'max': -1 }

        try
        {
            previous_t = this.samples.timestamp[0]

            for (var j = 1; j < this.samples.order.length; j++) {
                t =  this.samples.timestamp[this.samples.order[j]]
                delta = this.dateDiffInDays(previous_t, t)

                if (isNaN(delta)) {
                    throw TypeError("Are "+previous_t+" and "+t+" really dates?")
                }
                
                if (delta > delta_max)
                    delta_max = delta
                if (delta < delta_min)
                    delta_min = delta
                
                previous_t = t
            }
        }
        catch (e)
        {
            // The computation can fail if one of the times is badly given
            console.log("No delta times can be computed")
            delta_min = -1
            delta_max = -1
        }

        return { 'min': delta_min, 'max': delta_max }
    },        
    
    /**
     * return the sample date of the oldest sample/timepoint
     * @return {string} date_min - timestamp
     * */
    dateMin: function () {
        var date_min = "0"
        try{
            date_min = this.samples.timestamp[this.samples.order[0]] 
            
            for (var i = 1; i < this.samples.order.length; i++) {
                var date = this.samples.timestamp[this.samples.order[i]] 
                if (this.dateDiffInDays(date_min, date)<0){
                    date_min = date
                }
            }
        } catch (e) {}
        
        return date_min
    },        
    
    /**
     * return the sample date of the most recent sample/timepoint
     * @return {string} date_max - timestamp
     * */
    dateMax: function () {
        var date_max = "0"
        try{
            date_max = this.samples.timestamp[this.samples.order[0]]
        
            for (var i = 1; i < this.samples.order.length; i++) {
                var date = this.samples.timestamp[this.samples.order[i]] 
                if (this.dateDiffInDays(date_max, date)>0){
                    date_max = date
                }
            }
        } catch (e) {}
        
        return date_max
    },        
    
    /**
     * return sample/time name in a specified format
     * @param {integer} timeID - sample/time index
     * @param {string} [format] - can be 'name', 'sampling_date', 'delta_date', 'delta_date_no_zero', 
     * @return {string} sample name
     * */
    getStrTime: function (timeID, format){
        format = typeof format !== 'undefined' ? format : this.time_type;
        var result = "-/-"

        switch (format) {
            case "name":
            case "names":
                //TODO resolve thid hack
            case "short_name":
                if (typeof this.samples.names !== 'undefined' && this.samples.names[timeID] !== ""){
                    result = this.samples.names[timeID]
                }else{
                    result = this.samples.original_names[timeID]
                    result = result.split('/')[result.split('/').length-1]
                    result = result.split('.')[0]
                }
                if (format == "short_name"){
                    result = result.substring(0, 8);
                }
                break;

            case "sampling_date":
                if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[timeID] && this.samples.timestamp[timeID] != "None")
                    result = this.samples.timestamp[timeID].split(" ")[0]
                break;

            case "delta_date":
            case "delta_date_no_zero":            
                if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[0]){
                    var time0 = this.samples.timestamp[0];

                    if (timeID == '0'){
                        result = time0.split(" ")[0];

                        if (format == "delta_date_no_zero")
                            result = "";

                        break;
                    }else{
                        if ((typeof this.samples.timestamp != 'undefined') && this.samples.timestamp[timeID]){
                            time = this.samples.timestamp[timeID];
                            diff = this.dateDiffInDays(time0, time);
                            result = (diff >= 0 ? '+' : '') + diff;
                        }
                    }
                }
                break;
            default:
                if (typeof this.samples[format] != 'undefined') {
                    result = this.samples[format][timeID];
                }
                break;
        }
        return result
    },

    /**
     * 
     * */
    toStringThousands: function (num) {
        
        DECIMAL_SEPARATOR = " "
        s = num.toString()

        if (num <= 9999)
            return s

        l = s.length 
        ss = ""
        
        for (var i=l-1; i >= 0; i--) {
            ss += s[l-1-i]
            if (i && (i % 3) === 0)
                ss += DECIMAL_SEPARATOR
        }

        return ss
    },
    
/////////////////////////////////////////////////////////////////////////////
    
    /**
     * check browser version and display an error message for incompatible version
     * */
    checkBrowser: function () {
        this.browser_version = parseInt(navigator.appVersion, 10);
        this.browser = null

        if ((navigator.userAgent.indexOf("Chrome")) != -1) {
            this.browser = "Chrome";
        } else if ((navigator.userAgent.indexOf("Firefox")) != -1) {
            this.browser = "Firefox";
        } else if ((navigator.userAgent.indexOf("MSIE")) != -1) {
            this.browser = "Internet Explorer";
        } else if ((navigator.userAgent.indexOf("Safari")) != -1) {
            this.browser = "Safari";
        }

        //TODO check version 
        if (this.browser != "Chrome" &&
            this.browser != "Firefox" &&
            this.browser != "Safari") {
            console.log({"type": "popup", "default": "browser_error"});
        }

    },


    NB_READS_THRESHOLD_QUANTIFIABLE: 5,

    /**
     * Size threshold to compute percentages.
     * Under this threshold, the clone is 'positive, but not quantifiable'
     * inspired from clone:getSize()
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSizeThresholdQ: function (time) {
        time = this.getTime(time);

        if (this.reads.segmented[time] === 0 ) return 0;
        var result = this.NB_READS_THRESHOLD_QUANTIFIABLE / this.reads.segmented[time];

        if (this.norm) result = this.normalize(result, time);

        return result;
    },


    /**
     * return the size ratio with a fixed number of character
     * @param {integer} time - tracking point (default value : current tracking point)
     * @param {integer} size - the ratio to be formatted
     * @return {string} size
     * */
    getStrAnySize: function (time, size) {
        var sizeQ = this.getSizeThresholdQ(time);
        return this.formatSize(size, true, sizeQ)
    },

    /**
     * format size with the default format in use (model.notation_type) 
     * @param {float} size 
     * @param {bool} fixed - use a fixed size 
     * @param {float} sizeQ - under this size, this is not quantifiable
     * */
    formatSize: function (size, fixed, sizeQ) {
        var result = "−"

        if (size === 0 || typeof size == 'undefined') return result

        if (typeof sizeQ !== 'undefined') {
            if (size < sizeQ) {
                return "+"
                // return "< " + this.formatSize(sizeQ, true)
            }
        }

        switch (this.notation_type) {
        case "percent":
            if (fixed) {
                result = floatToFixed(100*size, 5) + "%";
            } else {
                //hack to avoid approximation due to javascript way to handle Number
                result = parseFloat((100 * size)
                    .toFixed(10)) + "%";
            }
            break;
        case "scientific":
            result = (size)
                .toExponential(1);
            break;
        }
        return result
    },
    
    /**
     * change the split of all clusters
     * @param {bool} bool - new value for all clones
     * */
    split_all: function (bool) {
        for (var i=0; i < this.clusters.length; i++) {
            this.clone(i).split = bool
        }
        this.update()
    },
    
    /**
     * return clone by index
     * @param {integer} clone index
     * @return {clone} 
     * */
    clone: function(cloneID) {
        return this.clones[cloneID]
    },
    
    
    /**
     * compute and display clone information in a window
     * @param {integer} cloneID - clone index
     * */
    displayInfoBox: function(cloneID) {
        $(".list").find(".infoBox").removeClass("infoBox-open")
        
        if (this.clone_info == cloneID) {
            this.closeInfoBox();
            return;
        }
        
        this.clone_info = cloneID;
        this.infoBox.style.display = "block";
        this.infoBox.lastElementChild.innerHTML = self.m.clone(cloneID).getHtmlInfo();
        $("#"+cloneID).find(".infoBox").addClass("infoBox-open")
        $("#f"+cloneID).find(".infoBox").addClass("infoBox-open")
    },

    /**
     * close clone information box
     * */
    closeInfoBox: function() {
        $(".list").find(".infoBox").removeClass("infoBox-open")
        $(".listSeq").find(".infoBox").removeClass("infoBox-open")
        this.clone_info = -1;
        this.infoBox.style.display = "none";
        this.infoBox.lastElementChild.removeAllChildren();
    },

 
    /**
     * open/build the tag/normalize menu for a clone
     * @param {integer} cloneID - clone index
     * */
    openTagSelector: function (cloneID, e) {
        var self = this;
        cloneID = typeof cloneID !== 'undefined' ? cloneID : this.cloneID;
        this.tagSelectorList.removeAllChildren();
        this.cloneID=cloneID

        var buildTagSelector = function (i) {
            var span1 = document.createElement('span');
            span1.className = "tagColorBox tagColor" + i
            span1.onclick = function () {
                self.clone(cloneID).changeTag(i)
                $(self.tagSelector).hide('fast')
            }

            var span2 = document.createElement('span');
            span2.className = "tagName" + i + " tn"
            span2.appendChild(document.createTextNode(self.tag[i].name))
            span2.onclick = function () {
                self.clone(cloneID).changeTag(i)
                $(self.tagSelector).hide('fast')
            }

            var div = document.createElement('div');
            div.className = "tagElem"
            div.appendChild(span1)
            div.appendChild(span2)

            var li = document.createElement('li');
            li.appendChild(div)

            self.tagSelectorList.appendChild(li);
        }

        for (var i = 0; i < this.tag.length; i++) {
            buildTagSelector(i);
        }
        
        var span1 = document.createElement('span');
        span1.appendChild(document.createTextNode("normalize to: "))

        
        this.norm_input = document.createElement('input');
        this.norm_input.id = "normalized_size";
        this.norm_input.type = "text";
        
        var span2 = document.createElement('span');
        span2.appendChild(this.norm_input)
        
        this.norm_button = document.createElement('button');
        this.norm_button.appendChild(document.createTextNode("ok"))
        this.norm_button.onclick = function () {
            var cloneID = self.cloneID;
            var size = parseFloat(self.norm_input.value);
            
            if (size>0 && size<1){
                self.norm_input.value = ""
                self.clone(cloneID).expected=size;
                self.compute_normalization(cloneID, size)
                self.update()
                $(self.tagSelector).hide('fast')
            }else{
                console.log({"type": "popup", "msg": "expected input between 0.0001 and 1"});
            }
        }
        this.norm_input.onkeydown = function (event) {
            if (event.keyCode == 13) self.norm_button.click();
        }
        
        var div = document.createElement('div');
        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(this.norm_button)
        
        var li = document.createElement('li');
        li.appendChild(div)

        this.tagSelectorList.appendChild(li);
        
        
        if (cloneID[0] == "s") cloneID = cloneID.substr(3);
        $(this.tagSelector).show();
        this.tagSelectorInfo.innerHTML = "tag for "+this.clone(cloneID).getName()+"("+cloneID+")"; 
        
        
        //replace tagSeelector
        var tagSelectorH = $(this.tagSelector).outerHeight()
        var minTop = 40;
        var maxTop = Math.max(40, $(window).height()-tagSelectorH);
        var top = e.clientY - tagSelectorH/2;
        if (top<minTop) top=minTop;
        if (top>maxTop) top=maxTop;
        this.tagSelector.style.top=top+"px";
    },


    /**
     * load a new germline and update 
     * @param {string} system - system string to load
     * @param {bool} only_this_system -
     * */
    changeGermline: function (system, only_this_system) {

        if (only_this_system)
        {
            this.keep_one_active_system(system);
            return ;
        }
        
        if (this.system_selected.indexOf(system) == -1){
            this.toggle_system(system)
        }
        
        this.loadGermline(system)
            .update()
            
        var radio = document.getElementsByName("germline")
        for(var elem in radio){
            if (radio[elem].value == system) radio[elem].checked=true;
        }
    },
    
    /**
     * change default notation display for sizes
     * @param {string} notation - notation type ('scientific' , 'percent')
     * @pram {bool} update - will update the display after
     * */
    changeNotation: function (notation, update) {
        this.notation_type = notation
        if (update) this.update()
    },
    
    /**
     * change default time format for sample/time names
     * @param {string} notation - format ('name', 'sampling_date', 'delta_date', 'delta_date_no_zero')
     * @pram {bool} update - will update the display after
     * */
    changeTimeFormat: function (time, update) {
        this.time_type = time
        if (update) this.update()
    },
    
    /**
     * change default color method
     * @param {string} colorM - TODO 
     * */
    changeColorMethod: function (colorM) {
        this.colorMethod = colorM;
        this.update();
    },
    
    /**
     * convert visible clones to csv 
     * @return {string} csv 
     * */
    toCSV: function () {
        //header
        var csv = Clone.prototype.toCSVheader(this).join(',')
        csv += "\n"
        
        //only non-empty active clones and virtual clones
        for (var i=0; i<this.clusters.length; i++){
            if ( (this.clusters[i].length !== 0 && this.clone(i).isActive()) || this.clone(i).isVirtual() ){
                csv += this.clone(i).toCSV().join(',')
                csv += "\n"
            }
        }
        
        return csv
    },
    
    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportCSV: function () {
        var textToWrite = this.toCSV()
        var textFileAsBlob = new Blob([textToWrite], {
            type: 'text'
        });

        var filename = this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')

        saveAs(textFileAsBlob, filename + ".csv");
    },

    /**
     * save a csv file of the currently visibles clones.
     * @return {string} csv 
     * */
    exportFasta: function () {
        var list = this.getSelected()
        if (list.length>0){
            var w = window.open("", "_blank", "selected=0, toolbar=yes, scrollbars=yes, resizable=yes");
            
            var fasta = '<pre>'
            for (var i=0; i<list.length; i++){
                fasta += this.clone(list[i]).getFasta() + '\n'
            }
            //V D J

            var listGene = [];
            var gene_germline = [];
            for (var j=0; j<list.length; j++){
                // gene_way: 5, 4, 3
                for (var gene_way = 5; gene_way >= 3; gene_way--) {
                    var gene = this.clone(list[j]).getGene(gene_way);

                    if ((gene !== undefined) && listGene.indexOf(gene) == -1) {
                        listGene.push(gene);
                        gene_germline.push(this.clones[list[j]].germline);
                    }
                }
            }

            for (var k=0; k<listGene.length; k++){
                var germName = gene_germline[k].substring(0, 3);

                if (typeof this.germline[germName][listGene[k]] != 'undefined') {
                    fasta += ">" + listGene[k] + '\n';
                    fasta += this.germline[germName][listGene[k]].toUpperCase().replace(/\./g, '') + '\n';
                }
            }

            var result = $('<div/>', {
                html: fasta
            }).appendTo(w.document.body);
        }else{
            console.log({msg: "Export FASTA: please select clones to be exported", type: 'flash', priority: 2});
        }
        
    },

    exportViewToPNG: function(tag) {
        exportD3ToPNG(tag, decodeURIComponent(this.getPrintableAnalysisName().replace(/[ \/\\:]/,'_')));
    },
    
    /**
     * produce an html systemBox of the given system
     * @param {string} system - system string ('trg', 'igh', ...)
     * @return {dom_element} span
     * */
    systemBox: function (system){
        
        var span = document.createElement('span')
        span.className = "systemBoxMenu";
        if ((typeof system != 'undefined')){
            span.appendChild(document.createTextNode(this.germlineList.getShortcut(system)));
            if (this.system_selected.indexOf(system) != -1) 
                span.style.background = this.germlineList.getColor(system)
            span.title = system
        }else{
            span.appendChild(document.createTextNode("?"));
            if (typeof system != 'undefined')
                span.title = system ;
        }
        return span
    },

    /**
     * return the system size
     * @param {string} system - system string ('trg', 'igh', ...)
     * @param {integer} time - sample/time index 
     * @return {float} size - system size in the given time/sample
     * */ 
    systemSize: function(system, time) {
        time = this.getTime(time)
        if (typeof this.reads.germline[system] != 'undefined'){
            return this.reads.germline[system][time]/this.reads.segmented[time]
        }else{
            if (this.system_available.indexOf(system) != -1 && this.system_available.length == 1){
                return 1
            }else{
                return 0
            }
        }
        
    },


    /* Two systems are in the same group when then only differs by '+' */

    sameSystemGroup: function(system1, system2) {
        system1 = system1.replace('+', '')
        system2 = system2.replace('+', '')
        return (system1 == system2)
    },

    /* Representation of a system group, such as 'TRD/TRD+' */

    systemGroup: function(system) {
        list = ''
        if (typeof system == 'undefined'){
            return "?"
        }

        for (var germline in this.reads.germline) {
            if (this.sameSystemGroup(germline, system)) {
                if (list) list += '/'
                list += germline
            }
        }
        return list
    },

    /* Returns the number of reads of a given system group at a given time */

    systemGroupSize: function(system, time) {
        time = this.getTime(time)
        reads = 0

        for (var germline in this.reads.germline) {
            if (this.sameSystemGroup(germline, system)) {
                reads += this.reads.germline[germline][time]
            }
        }

        return reads
    },


    
    wait: function(text){
        this.waiting_screen.style.display = "block";
        this.waiting_msg.innerHTML= text;
        if (typeof shortcut != 'undefined') shortcut.on = false;
    },
    
    resume: function(){
        this.waiting_screen.style.display = "none";
        this.waiting_msg.removeAllChildren();
        if (typeof shortcut != 'undefined') shortcut.on = true;
    },
    
    
    
    /* --------------------- */
    /* Filters / .isFiltered */

    /**
     * apply a boolean isFiltered too all Clones<br>
     * filtered clone will be hidden in all views
     * @param {boolean} bool - isFiltered value given to all clones
     * */
    reset_filter: function (bool) {
        for (var i=0; i<this.clones.length; i++){
            var c = this.clone(i)
            c.isFiltered=bool
        }
    },
    
    /**
     * apply a filter to all clones <br>
     * a clone need to contain a given string to pass the filter (search through name/nt sequence/sequenceName) (case insensitive)<br>
     * filtered clone will be hidden in all views
     * @param {string} str - required string to pass the filter
     * */
    filter: function (str) {
        this.reset_filter(true)
        for (var i=0; i<this.clones.length; i++){
            var c = this.clone(i)
            if (c.getName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequence().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSegAASequence('cdr3').toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getRevCompSequence().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
            if (c.getSequenceName().toUpperCase().indexOf(str.toUpperCase())!=-1 ) c.isFiltered = false
	}
        this.update()
    },
    

    //filter with d error
    /*filter: function(str){
      this.reset_filter(true)
      for (var i=0; i<this.clones.length; i++){
      var c = this.clone(i)
      if (distanceLevenshtein(c.getName().toUpperCase(), str.toUpperCase()) <= d)
      c.isFiltered = false
      if (distanceLevenshtein(c.getSequence().toUpperCase(), str.toUpperCase() <= d)
      c.isFiltered = false
      if (distanceLevenshtein(c.getRevCompSequence().toUpperCase(), str.toUpperCase()) <= d )
      c.isFiltered = false
      if (distanceLevenshtein(c.getSequenceName().toUpperCase(), str.toUpperCase()) <= d )
      c.isFiltered = false
      }
      this.update()
      },

    */

    /**
     * filter, keep only currently selected clones
     * */
    focusSelected: function () {
        // this.reset_filter(true)
        for (var i=0; i<this.clones.length; i++){
            var c = this.clone(i)
            c.isFiltered = !c.isSelected()
        }
        $("#filter_input").val("(focus on some clones)")
        this.update()
    },

    /**
     * hide selected clones
     * */
    hideSelected: function () {
        var list = this.getSelected();
        for (var i=0; i < list.length; i++) {
            this.clone(list[i]).isFiltered = true
        }
        this.unselectAll();
        $("#filter_input").val("(focus on some clones)")
        this.update()
    },


    /* --------------------- */

    
    
   /*For DBSCAN*/
    loadRandomTab: function() {
        this.tabRandomColor = [];
        /*Initialisation du tableau de couleurs*/
        for (var h = 0; h < this.clones.length; h++) {
            this.tabRandomColor.push(h);
        }
        /*Fisher yates algorithm to shuffle the array*/
        for (var i = this.clones.length - 1; i >= 1; i--) {
            var j = Math.floor(Math.random() * i) + 1;
            var abs = this.tabRandomColor[i];
            this.tabRandomColor[i] = this.tabRandomColor[j];
            this.tabRandomColor[j] = abs;
        }
    },

    /* Fonction permettant de charger la clusterisation avec DBSCAN, mais aussi de colorer les nodes 
    directement après en fonction de cette clusterisation
     *
     */
    loadDBSCAN: function(sp) {
        if (typeof(sp) != "undefined") this.sp = sp;
            this.dbscan = new DBSCAN(this.sp, this.eps, this.nbr);
            this.dbscan.runAlgorithm();
            for (var i = 0; i < this.dbscan.clusters.length; i++)
                for (var j = 0; j < this.dbscan.clusters[i].length; j++)
                    this.clones[this.dbscan.clusters[i][j]].cluster = i;
            //Color DBSCAN
            if (typeof(this.tabRandomColor) == "undefined") this.loadRandomTab();
            this.colorNodesDBSCAN();
            //Add information about the window (Noise, Core, ...)
            this.addTagCluster();
    },

    /* Fonction permettant de colorer les nodes en fonction de la clusterisation DBSCAN
    */
    colorNodesDBSCAN: function() {
        /*Adding color by specific cluster*/
        /*-> Solution provisoire quant à la couleur noire non voulue est d' "effacer" le nombre max de clusters, 
        mais de le prendre par défaut (100), soit un intervalle de 2.7 à chaque fois*/
        var maxCluster = this.dbscan.clusters.length;
        for (var i = 0; i < this.clones.length; i++) {
            if (typeof(this.clone(i)) != 'undefined') {
                this.clone(i).colorDBSCAN = colorGenerator( ( (270 / maxCluster) * (this.tabRandomColor[this.clone(i)] + 1) ));
            }
            else
                this.clone(i).colorDBSCAN = "";
        }
    },

    /* Fonction permettant d'ajouter un tab concernant un node - s'il est au coeur d'un cluster, 
    à l'extérieur ou appartenant à...
     */
    addTagCluster: function() {
        for (var i = 0; i < this.clones.length; i++)
            if (typeof(this.clone(i)) != 'undefined')
                switch (this.dbscan.visitedTab[i].mark) {
                case -1:
                        this.clone(i).tagCluster = "NOISE";
                        break;
                case 0:
                        this.clone(i).tagCluster = "CORE";
                        break;
                case 1:
                        this.clone(i).tagCluster = "NEAR";
                        break;
                }
            else
                this.clone(i).tagCluster = null;
    },

    /*
    // Fonction permettant de changer dynamiquement le nombre epsilon, pour DBSCAN
    //
    changeEps: function(newEps) {
        //Modification de l'attribut 'Eps' contenu dans l'objet
        this.eps = newEps;
        //Prise en compte du slider
        var html_container = document.getElementById('changeEps');
        if (html_container != null) {
            html_container.value = newEps;
        }
        //Création d'un nouvel objet DBSCAN
        this.loadDBSCAN();
        this.update();
        //Activation du moteur et autres paramètres spé à l'affichage du graphe DBSCAN
        if (this.sp.dbscanActive) this.sp.runGraphVisualization("dbscan");
        //Changement de l'affichage de la valeur liée au slider
        this.changeSliderValue(true, "DBSCANEpsSlider", "Eps ", this.eps);
    },

    // Fonction permettant de changer dynamiquement le nombre de voisins minimum, pour DBSCAN
    //
    changeNbr: function(newNbr) {
        //Modification de l'attribut 'nbr' contenu dans l'objet
        this.nbr = newNbr;
        //Prise en compte du slider
        var html_container = document.getElementById('changeNbr');
        //Changement de la valeur du slider
        if (html_container != null) {
            html_container.value = newNbr;
        }
        //Création d'un nouvel objet DBSCAN
        this.loadDBSCAN();
        this.update();
        //Activation du moteur et autres paramètres spé à l'affichage du graphe DBSCAN
        if (this.sp.dbscanActive) this.sp.runGraphVisualization("dbscan");
        //Changement de l'affichage de la valeur liée au slider
        this.changeSliderValue(true, "DBSCANNbrSlider", "Nbr ", this.nbr);
    },

    */
    /* Fonction permettant de changer dynamiquement la valeur d'affichage, à côté du slider Epsilon/MinPts dans le menu Display
    */
    changeSliderValue: function(bool, div, name, value) {
        div = document.getElementById(div);
        var text = document.createTextNode(name + value);
        if (bool) {
            //Suppression du précédent noeud
            div.removeChild(div.childNodes[0]);
        }
        if (!bool) div.insertBefore(document.createElement('br'), div.firstChild);
        div.insertBefore(text, div.firstChild);
    },

    /* Fonction permettant de changer dynamiquement la valeur d'affichage du slider "Edit Distance"
    */
    changeSliderEditDistanceValue: function(bool, value) {
        var div = document.getElementById("EditDistanceSlider");
        var text =  document.createTextNode("Distance: " + value);
        if (!bool) {
            div.removeChild(div.childNodes[0]);
        }
        else {
            div.insertBefore(text, div.firstChild);
        }
    },
    
    /* put a marker on a specific edge, for the edit distance distribution
     *
     */
    focusEdge: function(edge) {
       $(".focus")
            .text(this.printInformationEdge(edge));
    },

    /* remove the focus marker to the edge
     *
     */
    removeFocusEdge: function() {
        $(".focus")
            .text("")
    },

    /* print informations of a specific edge
     */
    printInformationEdge: function(edge) {
        return this.getName(edge.source)+" -- "+this.getName(edge.target)+" == "+edge.len;
    },

    DEFAULT_SEGMENTER_URL: "https://dev.vidjil.org/vidjil/segmenter",

    /*
     * Load the default primers sets into the model.
     * TODO : Should load data directly from primers files from germline or other dict
     * TODO : Give the posibility to user to load his own primer set
     */
    populatePrimerSet : function () {
        this.primersSetData = {"biomed2" : {}, "primer_fictif": {}, "primer_test": {} }


      // Seq de primer biomed2 des TCRD
      this.primersSetData.biomed2.TRD = {}; // TODO : init by defaultdict equivalent
      this.primersSetData.biomed2.TRD.primer5 = [];
      this.primersSetData.biomed2.TRD.primer3 = [];
      // Seq de primer biomed2 des IGH
      this.primersSetData.biomed2.IGH = {}; // TODO : init by defaultdict equivalent
      this.primersSetData.biomed2.IGH.primer5 = ["GGCCTCAGTGAAGGTCTCCTGCAAG", "GTCTGGTCCTACGCTGGTGAAACCC", "CTGGGGGGTCCCTGAGACTCTCCTG", "CTTCGGAGACCCTGTCCCTCACCTG", "CGGGGAGTCTCTGAAGATCTCCTGC", "TCGCAGACCCTCTCACTCACCTGTG", "CTGGGTGCGACAGGCCCCTGGACAA", "TGGATCCGTCAGCCCCCAGGGAAGG", "GGTCCGCCAGGCTCCAGGGAA", "TGGATCCGCCAGCCCCCAGGGAAGG", "GGGTGCGCCAGATGCCCGGGAAAGG", "TGGATCAGGCAGTCCCCATCGAGAG", "TTGGGTGCGACAGGCCCCTGGACAA", "TGGAGCTGAGCAGCCTGAGATCTGA", "CAATGACCAACATGGACCCTGTGGA", "TCTGCAAATGAACAGCCTGAGAGCC", "GAGCTCTGTGACCGCCGCGGACACG", "CAGCACCGCCTACCTGCAGTGGAGC", "GTTCTCCCTGCAGCTGAACTCTGTG", "CAGCACGGCATATCTGCAGATCAG"] ;
      this.primersSetData.biomed2.IGH.primer3 = ["CCAGTGGCAGAGGAGTCCATTC", "GTCACCGTCTCCTCAGGTA"]; // GTCACCGTCTCCTCAGGTA is a consensus sequence use because official one (CCAGTGGCAGAGGAGTCCATTC) doesn't work properly


      // test fictif; sequence inclut dans les sequences de clones
      this.primersSetData.primer_fictif.TRD = {};
      this.primersSetData.primer_fictif.TRD.primer5 = ["GATTTTACTCAAGGACGGTT", "GCAAAGAACCTGGCTGT", "AGATTTTACTCAAGGAC"] // V3, V2,
      this.primersSetData.primer_fictif.TRD.primer3 = ["AGGAACCCGTGTGACT", "GAACACAACTCATCGTGGA", "GAACTGGCATCAAACTCTTC"] // J1, J2, J3

      // Test qunits
      this.primersSetData.primer_test.IGH = {};
      this.primersSetData.primer_test.IGH.primer5 = [] // IGH seq from model_test.js
      this.primersSetData.primer_test.IGH.primer3 = []
      this.primersSetData.primer_test.TRG = {};
      this.primersSetData.primer_test.TRG.primer5 = ["GGAAGGCCCCACAGCG"] // TRG seq from model_test.js
      this.primersSetData.primer_test.TRG.primer3 = ["AACTTCGCCTGGTAA"]
    },


    /*
     * Generic function to add a feature based on sequence for each clones
     */
    addSegFeatureFromSeq : function (feature, sequence) {
        if (this.clones.length > 100 ) {
            numberToProcess = 100
        } else {
            numberToProcess = this.clones.length
        }

        for (var i = 0; i < numberToProcess; i++) {
            if ( !this.clones[i].isVirtual() ) {
                if (this.clones[i].sequence.indexOf(sequence) != -1) {
                    this.clones[i].addSegFeatureFromSeq(feature, sequence)
                }
            }
        }
    },


    /*
     * Delete all previous entries for a seg feature for all clones
     * Start the adding of primers on a clean base
     */
    cleanPreviousFeature : function (feature) {
        for (var i = 0; i < this.clones.length; i++) {
            if ( !this.clones[i].isVirtual() ) {
                    delete this.clones[i].seg[feature]
            }
        }
    },


    /*
     * Add to each clones the primer sequence and positions for seg 5 and 3
     * Insert into the primer field the name of the primer set used
     * Replace/erase the value of primer field if this one already exist
     */
    switchPrimers : function () {
        if (typeof this.primerSetCurrent == "undefined") {
            console.log("Primer set unknow")
            return -1
        }
        primersSet = this.primerSetCurrent

        this.cleanPreviousFeature("primer5")
        this.cleanPreviousFeature("primer3")
        for (var i = 0; i < this.system_available.length; i++) {
            var germline = this.system_available[i].replace("+", "")

            primer5 = this.primersSetData[this.primerSetCurrent][germline].primer5
            primer3 = this.primersSetData[this.primerSetCurrent][germline].primer3

            for (var p = 0; p < primer5.length; p++) {
                this.addSegFeatureFromSeq("primer5", primer5[p])
            }
            for (var q = 0; q < primer3.length; q++) {
                this.addSegFeatureFromSeq("primer3", primer3[q])
            }
        }
    },


    /*
     * Set the current primer set of the model
     * Compute the positions of these primers inside each clones
     */
    switchPrimersSet : function(primersSet){
        if (typeof this.primersSetData == "undefined") {
            this.populatePrimerSet();
            console.log("Primer set have been loaded")
        }
        if (typeof this.primersSetData[primersSet] == "undefined") {
            console.log("Primer set unknow")
            return 1
        } else {
            this.primerSetCurrent = primersSet;
            console.log("Current primer set : "+ this.primerSetCurrent)
            this.switchPrimers();
            this.update();
            return 0
        }
        this.update();
    },

    
    /**
     * sends an ajax request to manually add special clones
     * @param {string} input - the id of the input to extract the sequences from
     */
    addManualClones: function(input) {
        var url = config && config.segmenter_address ? config.segmenter_address : this.DEFAULT_SEGMENTER_URL;

        var inputNode = document.getElementById(input);
        if (!inputNode) {
            console.log("[model] could not find '" + input + "' input node");
            return;
        }

        if (inputNode) {
            var sequences = inputNode.value;

            // When empty, show error
            if (!sequences) {
                showAddManualCloneMenu(true);
            } else {
                var self = this;
                var displayAjax = function (display) {
                    var liveAjaxNode = document.getElementById("live-ajax");
                    var bodyNode = document.getElementsByTagName("body")[0];
                    if (display) {
                        // var imgNode = document.createElement("img");
                        liveAjaxNode.appendChild(icon('icon-spin4 animate-spin', 'Sequences are being analyzed'));
                        bodyNode.style.cursor = "wait";
                    } else {
                        while (liveAjaxNode.lastChild) {
                            liveAjaxNode.removeChild(liveAjaxNode.lastChild);
                        }
                        bodyNode.style.cursor = "default";
                    }
                };
                var params = {
                    method: "POST",
                    data: {
                        sequences: sequences
                    },
                    success: function (data) {
                        displayAjax(false);
                        if (data.error) {
                            console.log({ msg: data.error, type: "flash", priority: 2 });
                            return;
                        }

                        var index = self.clones.length;
                        data.clones.forEach(function (clone) {
                            clone.quantifiable = false;
                            clone = new Clone(clone, self, index);
                            // Array with self.sample.number times the same value
                            clone.reads = Array.apply(null, Array(self.samples.number))
                                .map(function(){return SIZE_MANUALLY_ADDED_CLONE})
                            clone.top = 1
                            self.mapID[clone.id] = index;
                            index++;
                        });

                        self.shouldRefresh();
                        self.update();
                        console.log({ msg: "Clone(s) added!", type: "flash", priority: 1 })
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        displayAjax(false);
                        console.log({ msg: textStatus + " " + errorThrown, type: "flash", priority: 2 });
                    },
                    timeout: 60000
                };
                $.ajax(url, params);
                displayAjax(true);
            }
        }
    },

    shouldRefresh: function () {
        this.view.forEach(function (view) {
            if (view.shouldRefresh) {
                view.shouldRefresh();
            }
        });
    },


}; //end prototype Model
