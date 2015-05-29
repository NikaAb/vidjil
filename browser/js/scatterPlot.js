/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
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


/**
 * scatterplot is a View object who display node as bubble or bar according to 2 selected axis
 * 
 * @constructor 
 * @augments View
 * @this View
 * 
 * @param {string} id - dom id of the html div who will contain the scatterplot
 * @param {Model} model
 * */
function ScatterPlot(id, model) {
    var self = this;
    
    View.call(this, model);
    
    this.id = id; //ID of the scatterPlot div

    //size ( computed value -> resize() function)
    this.resizeCoef = 1; //Multiplifying factor, application to nodes radius
    this.resizeW = 1; //scatterplot width
    this.resizeH = 1; //scatterplot height
    this.gridSizeW = 1; //grid width
    this.gridSizeH = 1; //grid height

    //Margins left/right ( fixed value )
    this.marge_left = 120;
    this.marge_right = 10;
    this.marge_top = 75;
    this.marge_bot = 25;

    this.max_precision = 9; //Precision max (default: 9)

    /* EDIT DISTANCE ONLY
       BEG --
    */
    this.mouseZoom = 1; //Zoom (scroll wheel)
    this.reinit = false; //Boolean used to know the physics engine state (reinit/init)
    this['continue'] = false; //Boolean used for the nodes movements
    this.allEdges = new Array(); //Initial edges array
    this.edgeSaved = new Array(); //Edges array saved for the Edit Distance visualization
    this.edge = new Array(); //Edges array given to the engine
    this.edgeContainer = null; //SVG element to save the container of graph distribution
    this.active_move = false; //Boolean given to the nodes movements
    this.reloadCharge = true; //Boolean allowing to reload the physic engine charge (reject)
    this.canSavePositions = true; //Boolean which allows to save initial positions of nodes
    this.initialPositions = []; //Initial positions of all nodes - usefull when calling reinit_motor()
    //Object which allows to save new position, and move all nodes according to the object's parameters
    this.positionToMove = {
        originx: 0,
        originy: 0,
        x: 0,
        y: 0
    };
    this.distanceMax = 10; //Distance max to display (Edit Distance visualization)
    /*
       END --
    */

    this.dbscanActive = false; //Boolean to know if the DSCAN visualization is on
    this.DBSCANLength = 5; //Length of the DBSCAN edges

    this.mode = "plot";
    this.splitY = "gene_j"; //Distribution method, for the Y axis
    this.splitX = "gene_v"; //Distribution method, for the X axis

    this.time0 = Date.now(), //Initial date saved
    this.time1 = this.time0; //Frames computed
    this.fpsqueue = []; //Numbers of frames computed, according to the 20th last values

    //Booléen pour le sélecteur de nodes
    this.active_selector = false

    //axis X text position
    this.rotation_x = 0;
    this.text_position_x = 30;
    this.sub_text_position_x = 45;

    //axis Y text position
    this.rotation_y = 0;
    this.text_position_y = 60;
    this.sub_text_position_y = 100;

    //Clone selected
    this.cloneSelected = -1;

    //mouse coordinates
    this.coordinates = [0, 0];

    // Plot axis
    this.available_axis = {
        "gene_v": { 
            label:"gene V" 
        },
        "gene_j": { 
            label:"gene J" 
        },
        "allele_v": { 
            label:"allele V" 
        },
        "allele_j": { 
            label:"allele J" 
        },
        "sequenceLength" : { 
            label: "clone length",
            fct: function(cloneID) {return self.m.clone(cloneID).getSequenceLength()}
        },
        "GCContent" : { 
            label: "GC content",
            fct: "GCContent", 
            output: "percent"
        },
        "n": {
            label: "N length",
            fct: function(cloneID) {return self.m.clone(cloneID).getNlength()} 
        },
        "lengthCDR3": {
            label: "CDR3 length",
            fct: function(cloneID) {return self.m.clone(cloneID).seg["cdr3"].length}
        },
        "coverage": { 
            label: "clone coverage",
            fct: function(cloneID){return self.m.clone(cloneID).coverage},
            min: 0,
            max: 1, 
            output: "float-2", 
            log: false 
        },
        "locus" : { 
            label: "locus",
            fct: function(cloneID){return self.m.clone(cloneID).germline},
            output: "string-sorted"
        },
        "Size" : { 
            label: "size",
            fct : function(cloneID){return self.m.clone(cloneID).getSizeZero()}, 
            min : function(){return self.m.min_size},
            max : 1, 
            output : "percent", 
            log : true  
        },
        "otherSize" : { 
            label: "size (other point)",
            fct : function(cloneID){return self.m.clone(cloneID).getSizeZero(m.tOther)}, 
            min : function(){return self.m.min_size}, 
            max : 1, 
            output : "percent", 
            log : true  
        },
        "tsneX": { 
            label: "",
            fct: function(cloneID){
                var r = self.gridSizeH/self.gridSizeW;
                var k=1;
                var yMax = self.m.similarity_builder.yMax
                if (yMax > r) k = r/yMax
                return k*self.m.clone(cloneID).tsne[0]
            },
            output: "float-2", 
            log: false,
            min: 0,
            max: 1, 
            hide : true 
        },
        "tsneY": { 
            label: "",
            fct: function(cloneID){
                var r = self.gridSizeH/self.gridSizeW;
                var k=1;
                var yMax = self.m.similarity_builder.yMax
                if (yMax > r) k = r/yMax
                return k*self.m.clone(cloneID).tsne[1]
            },
            output: "float-2", 
            log: false,
            min: 0,
            max: function(){return self.gridSizeH/self.gridSizeW},
            hide : true 
        },
        "tsneX_system": { 
            label: "",
            fct: function(cloneID){
                var r = self.gridSizeH/self.gridSizeW;
                var k=1;
                var yMax = self.m.similarity_builder.system_yMax[self.m.clone(cloneID).get("germline")]
                if (yMax > r) k = r/yMax
                return k*self.m.clone(cloneID).tsne_system[0]
            },
            output: "float-2", 
            log: false,
            min: 0,
            max: 1, 
            hide : true 
        },
        "tsneY_system": { 
            label: "",
            fct: function(cloneID){
                var r = self.gridSizeH/self.gridSizeW;
                var k=1;
                var yMax = self.m.similarity_builder.system_yMax[self.m.clone(cloneID).get("germline")]
                if (yMax > r) k = r/yMax
                return k*self.m.clone(cloneID).tsne_system[1]
            },
            output: "float-2", 
            log: false,
            min: 0,
            max: function(){return self.gridSizeH/self.gridSizeW},
            hide : true 
        }
    }
    
    // Plot Presets
    this.preset = { 
        "V/J (genes)" : { "mode": "plot", "x" : "gene_v", "y": "gene_j"},
        "V/J (alleles)" : { "mode": "plot", "x" : "allele_v", "y": "allele_j"},
        "graph" : { "mode": "plot", "x" : "tsneX", "y": "tsneY"},
        "graph_by_system" : { "mode": "plot", "x" : "tsneX_system", "y": "tsneY_system"},
        "V/N length" : { "mode": "plot", "x" : "gene_v", "y": "n"},
        "clone length / locus" : { "mode": "plot", "x": "sequenceLength", "y" : "locus"},
        "clone length / GC content " : { "mode": "plot", "x": "sequenceLength", "y" : "GCContent"},
        "clone coverage / GC content " : { "mode": "plot", "x": "coverage", "y" : "GCContent"},
        // "V/abundance" : { "mode": "plot", "x" : "gene_v", "y": "Size"},
        "V distribution" :            { "mode": "bar", "x" : "gene_v",         "y": "gene_j"},
        "Clone length distribution" : { "mode": "bar", "x" : "sequenceLength", "y": "gene_v"},
        "N length distribution" :     { "mode": "bar", "x" : "n",              "y": "gene_v"},
        "compare two samples" : { "mode": "plot", "x" : "Size", "y": "otherSize"}
        
    };
    this.default_preset = 1

    //Menu with graph distrib' (see initMenu function)
    this.graph_menu = [
        ["dbscan", "Dbscan graph"],
        ["graph", "Edit dist. graph"]
    ];

    this.axisX = new Axis(this.m, false)
    this.axisY = new Axis(this.m, true)
    this.use_system_grid = false
}



ScatterPlot.prototype = {

    /**
     * init the view before use <br>
     * build grid / pre-select axis
     * */
    init: function() {
        console.log("ScatterPlot " + this.id + ": init()");

        document.getElementById(this.id)
            .innerHTML = "";

        this.initMenu();
        this.initSVG();
        this.axisX.useGermline(this.m.germlineV, "V")
        this.axisY.useGermline(this.m.germlineJ, "J")

        this.select_preset.selectedIndex = this.default_preset
        this.changePreset();
        this.tsne_ready=false;

        this.resize();
    },

    /**
     * build all the svg container who will receive axis / labels / clones
     * */
    initSVG: function() {
        var self = this;

        this.label_container = d3.select("#" + this.id)
            .attr("class", "scatterplot")
            .append("div")
            .attr("id", this.id + "_label_container")

        //création de la fenetre SVG
        this.vis = d3.select("#" + this.id)
            .append("svg:svg")
            .attr("id", this.id + "_svg");

        //création de l'arriere plan
        d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("id", this.id + "_back")
            .attr("class", "background_sp")
            .attr("x", 0)
            .attr("y", 0)
            //Actions sur l'arrière-plan
            .on("mouseover", function() {
                self.m.focusOut();
                self.m.removeFocusEdge();
            })
            .on("mousedown", function() {
                self.activeSelector();
            })

        //Actions sur le corps -|- aux sélections
        $("body").bind("mouseup", function(e) {
            d3.event = e;
            self.stopSelector()
        })
        $("body").bind("mousemove", function(e) {
            d3.event = e;
            self.updateSelector()
        })

        //add a container for x axis in the scatterplot svg
        this.axis_x_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_x_container")

        //add a container for y axis in the scatterplot svg
        this.axis_y_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_y_container")

        //add a container for plots/bar in the scatterplot svg
        this.plot_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_plot_container")
            
        //add a container for axis label in the scatterplot svg
        this.axis_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_axis_container")


        $("#" + this.id + "_plot_container")
            .fadeTo(0, 0)
        setTimeout(function() {
            $("#" + self.id + "_plot_container")
                .fadeTo(300, 1)
        }, 2000);

        //Sélection du contenu de bar -> Ajout d'un attribut valant un id
        this.bar_container = d3.select("#" + this.id + "_svg")
            .append("svg:g")
            .attr("id", this.id + "_bar_container")

        //Initialisation du sélecteur
        this.selector = d3.select("#" + this.id + "_svg")
            .append("svg:rect")
            .attr("class", "sp_selector")
            .attr("id", this.id + "_selector")
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", 5)
            .attr("ry", 5)

        //Initialisation du groupe d'arêtes (pour le graphe de comparaison, au niveau de la distance d'édition)
        this.grpLinks = this.plot_container.append('svg:g')
            .attr('class', 'grpLinks');

        //Initialisation of nodes
        this.nodes = d3.range(this.m.clones.length)
            .map(Object);
        for (var i = 0; i < this.m.clones.length; i++) {
            this.nodes[i].id = i; //L'id d'un cercle vaut le nombre de i dans la boucle
            this.nodes[i].r1 = 5; // longueur du rayon1
            this.nodes[i].r2 = 5; // longueur du rayon2
            this.nodes[i].x = Math.random() * 500;
            this.nodes[i].old_x = [0, 0, 0, 0, 0]
            this.nodes[i].y = Math.random() * 250;
            this.nodes[i].old_y = [0, 0, 0, 0, 0]
        };

        //Initialisation of tmp array which contains all the edges
        this.allEdges = this.m.links;
        //Initialisation of array which contains all the usefull edges for the Edit Distane visualization
        this.edge = this.keepUsefullEdgesForEditDistanceGraph(this.allEdges);

        /*
        //DBSCAN algorithm loading
        this.m.loadDBSCAN(this);
        //DBSCAN sliders values loading
        this.m.changeSliderValue(true, "DBSCANNbrSlider", "Nbr ", this.m.nbr);
        this.m.changeSliderValue(true, "DBSCANEpsSlider", "Eps ", this.m.eps);
        */

        //Initialisation of the D3JS physic engine
        this.force = d3.layout.force();
        this.initMotor();
        this.force
            .nodes(this.nodes) //Nodes array initialisation
            .on("tick", function(){self.tick()}); // on -> Listen updates compared to modified positions

        //Création d'un element SVG pour chaque nodes (this.node.[...])
        this.node = this.plot_container.selectAll("circle")
            .data(this.nodes) //Ajout de données pour les cercles
        this.node.enter()
            .append("svg:circle"); //Ajout d'un élément SVG (cercle) à un node
        this.node.exit()
            .remove() //On efface tous les cercles non pris en compte

        //Action concernant tous les nodes présents dans le ScatterPlot
        this.plot_container.selectAll("circle")
            .attr("stroke", "")
            .attr("id", function(d) {
                return "circle" + d.id;
            })
            //Attribution de l'activité des cercles (inactif, sélectionné, demande d'info ou autre)
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_inactive";
                if (self.m.clone(p.id)
                    .isSelected()){
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus circle_select";
                    return "circle_select";
                }
                if (self.m.clone(p.id)
                    .isFocus()) return "circle_focus";
                return "circle";
            })
            //Appel de la fonction drag
            .call(this.force.drag)
            //Action -> Si la souris est pointée/fixée sur un cercle, alors on affiche l'information concernant ce cercle
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            //Action -> Si l'on clique sur un cercle, alors on le sélectionne
            .on("click", function(d) {
                self.clickNode(d.id);
            })

    },

    /**
     * Function which allows to return the number of active clones
     * @return {integer}
     * */
    returnActiveclones: function() {
        var activeclones = 0;
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.clone(i)
                .isActive()) activeclones += 1;
        }
        return activeclones;
    },

    /**
     * initialize the D3JS physic engine with default values - usefull with reinitMotor()
     * */
    initMotor: function() {
        this.force
            .gravity(0) //No gravity
            .theta(0) //Default value: 0.8
            .charge(0) //Default value: -1
            .friction(0.75) //Velocity
            .size([1, 1]);
        //Previous graph destruction
        this.unsetGraphLinks();
        //Free nodes
        this.fixedAllClones(false);
    },

    /**
     * build scatterplot menu <br>
     * preset/axisX/axisY selector<br>
     * scatterplot/bargraph selector<br>
     * */
    initMenu: function() {
        var self = this;
        
        var divParent = document.getElementById(this.id)
        var anchor = document.createElement('div');
        anchor.className = "sp_menu_anchor";
        var menu = document.createElement('div');
        menu.className = "sp_menu";
        var content = document.createElement('div');
        content.className = "sp_menu_content";
        
        var div_x = document.createElement('div');
        div_x.className = "axis_select axis_select_x";

        var div_y = document.createElement('div');
        div_y.className = "axis_select axis_select_y";
        
        var div_preset = document.createElement('div');
        div_preset.className = "axis_select axis_select_preset";

        this.select_x = document.createElement('select');
        //Initialisation du menu déroulant
        this.select_x.setAttribute('name', 'select_x[]');
        this.select_x.onchange = function() {
            self.changeXaxis();
        }

        this.select_y = document.createElement('select');
        this.select_y.setAttribute('name', 'select_y[]');
        this.select_y.onchange = function() {
            self.changeYaxis();
        }
        
        //Ajout de chaque méthode de répartition dans les menus pour l'axe des X/Y
        for (var key in this.available_axis) {
            if (typeof this.available_axis[key].hide == "undefined" || !this.available_axis[key].hide){
                var element = document.createElement("option");
                element.setAttribute('value', key);
                var text = document.createTextNode(this.available_axis[key].label);
                element.appendChild(text);

                var element2 = element.cloneNode(true);

                this.select_x.appendChild(element);
                this.select_y.appendChild(element2);
            }
        }

        this.select_preset = document.createElement('select');
        this.select_preset.className = "axis_select_preset_select";
        //Initialisation du menu déroulant
        this.select_preset.setAttribute('name', 'select_preset[]');
        this.select_preset.onchange = function() {
            self.changePreset();
        }
        
        var element = document.createElement("option");
        element.setAttribute('value', "custom");
        element.appendChild(document.createTextNode("–"));
        this.select_preset.appendChild(element);

        var p = 0
        for (var i in this.preset) {
            var element = document.createElement("option");
            element.setAttribute('value', i);
            element.appendChild(document.createTextNode('[' + p + '] ' + i));
            this.select_preset.appendChild(element);
	    p += 1;
        }
        
        div_x.appendChild(document.createTextNode("x "));
        div_x.appendChild(this.select_x);
        div_y.appendChild(document.createTextNode("y "));
        div_y.appendChild(this.select_y);
        div_preset.appendChild(document.createTextNode("preset "));
        div_preset.appendChild(this.select_preset);

        
        
        /*Graph menu initialization*/
        /*
        var div_graph = document.createElement('div');
        div_graph.className = "axis_select axis_select_graph"

        var select_graph = document.createElement('select');
        select_graph.setAttribute('name', 'select_graph[]');
        select_graph.id = "select_graph"

        select_graph.onchange = function() {
            self.changeXaxis();
        }

        for (var i = 0; i < this.graph_menu.length; i++) {
            var element = document.createElement("option");
            element.setAttribute('value', this.graph_menu[i][0]);
            var text = document.createTextNode(this.graph_menu[i][1]);
            element.appendChild(text);

            select_graph.appendChild(element);

        }

        div_graph.appendChild(select_graph);
        
        */
        
        var span_icon_bar = document.createElement('div');
        span_icon_bar.className = "sp_menu_icon";
        span_icon_bar.id = this.id+"_bar";
        jQuery.get("images/bar.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_bar).empty().append(svg);
            }, 'xml');
        span_icon_bar.onclick = function(){
                self.changeMode("bar");
            };
        
        span_icon_plot = document.createElement('div');
        span_icon_plot.className = "sp_menu_icon";
        span_icon_plot.id = this.id+"_plot";
        jQuery.get("images/plot.svg", function(data) {
                var svg = jQuery(data).find('svg');
                $(span_icon_plot).empty().append(svg);
            }, 'xml');
        span_icon_plot.onclick = function(){
                self.changeMode("plot");
            };
        
        var div_mode = document.createElement('div');
        div_mode.className = "sp_menu_mode";
        div_mode.appendChild(span_icon_bar);
        div_mode.appendChild(span_icon_plot);
        
        //Added all childs
        content.appendChild(div_preset);
        content.appendChild(div_mode);
        content.appendChild(div_x);
        content.appendChild(div_y);
        //menu.appendChild(div_graph);
        menu.appendChild(document.createTextNode("plot"));
        menu.appendChild(content)
        anchor.appendChild(menu);
        divParent.appendChild(anchor);
        
        if (this.mode=="bar") $("#"+this.id+"_bar").addClass("sp_selected_mode")
        if (this.mode=="plot") $("#"+this.id+"_plot").addClass("sp_selected_mode")
    },

    /**
     * init bar positions using current bubbles positions
     * */
    initBar: function() {
        self = this;

        //création d'un element SVG pour chaque nodes
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar.enter()
            .append("svg:rect");
        this.bar.exit()
            .remove()
        this.bar_container.selectAll("rect")
            .attr("id", function(d) {
                return "bar" + d.id;
            })
            
            //use clone circle position to init the clone bar position
            .attr("width", function(d) { return d.r2*2 })
            .attr("x", function(d) { return d.x+self.marge_left-(d.r2) })
            .attr("height", function(d) { return d.r2*2 })
            .attr("y", function(d) { return d.y+self.marge_top-(d.r2) })
            .style("fill", function(d) {
                return (self.m.clone(d.id)
                    .getColor());
            })
            .on("mouseover", function(d) {
                self.m.focusIn(d.id);
            })
            .on("click", function(d) {
                self.m.select(d.id);
            })
    },

    /**
     * compute and update the position of all rectangles representing a clone using selected axis
     * */
    updateBar: function() {
        self = this
        
        //split clones into bar (axisX)
        switch (this.splitX) {
            case "allele_v" :
                this.makeBarTab(function(cloneID){return self.m.clone(cloneID).getGene("5")}, Object.keys(self.m.germlineV.allele))
                break;
            case "gene_v" :
                this.makeBarTab(function(cloneID){return self.m.clone(cloneID).getGene("5",false)}, Object.keys(self.m.germlineV.gene))
                break;
            case "allele_j" :
                this.makeBarTab(function(cloneID){return self.m.clone(cloneID).getGene("3")}, Object.keys(self.m.germlineJ.allele))
                break;
            case "gene_j" :
                this.makeBarTab(function(cloneID){return self.m.clone(cloneID).getGene("3",false)}, Object.keys(self.m.germlineJ.gene))
                break;
            default :
                if (typeof this.available_axis[this.splitX])
                    this.makeBarTab(this.available_axis[this.splitX].fct);
            break;
        }
        
        //sort each bar (axisY)
        
        switch (this.splitY) {
            case "allele_v" :
                this.sortBarTab(function(cloneID){return self.m.clone(cloneID).getGene("5")});
                break;
            case "gene_v" :
                this.sortBarTab(function(cloneID){return self.m.clone(cloneID).getGene("5",false)});
                break;
            case "allele_j" :
                this.sortBarTab(function(cloneID){return self.m.clone(cloneID).getGene("3")});
                break;
            case "gene_j" :
                this.sortBarTab(function(cloneID){return self.m.clone(cloneID).getGene("3",false)});
                break;
            default :
                if (typeof this.available_axis[this.splitY]){
                    this.sortBarTab(this.available_axis[this.splitY].fct);
                }else{
                    this.sortBarTab(function(a){return self.m.clone(a).getGene("3")});
                }
            break;
        }
        
        //compute position for each clones
        this.computeBarTab();
        
    },
    
    /**
     * sort clones in different bar using a distribution function and a list of potential values <br>
     * the values list length is the minimum number of bar we will get<br>
     * if the distribution function return a value outside the list of given potential values, a new bar will be created for this value
     * param {function} fct - distribution function
     * param {string[]} values - a list of potential values
     * */
    makeBarTab: function (fct, values) {
        var min, max;
        this.barTab = {};
        
        if (typeof fct == "string"){
            var tmp = fct 
            fct = function(id){ 
                return self.m.clone(id).get(tmp)
            }
        }
        
        if (typeof values == "undefined"){
            for (var i in this.m.clones) {
                var clone = this.m.clone(i)
                if (!this.use_system_grid || (this.use_system_grid && this.m.germlineV.system == clone.get('germline') ) ){
                    var v;
                    try{
                        var v = fct(i);
                    }catch(e){}
                    if (typeof v != "undefined" && v != 0){
                        if (v<min || typeof min == "undefined") min = v;
                        if (v>max || typeof max == "undefined") max = v;
                    }
                }
            }
            for (var i=min; i<=max; i++) this.barTab[i]=[];
        }else{
            for (var i in values) {
                this.barTab[values[i]]=[];
            }
        }
        
        this.barTab["?"]=[];
        
        for (var i in this.m.clones) {
            var clone = this.m.clone(i)
            if (!this.use_system_grid || (this.use_system_grid && this.m.germlineV.system == clone.get('germline') ) ){
                var v;
                try{
                    var v = fct(i);
                }catch(e){}
                if (typeof v == "undefined" || typeof this.barTab[v] == "undefined" ) {
                    this.barTab["?"].push(i);
                }else{
                    this.barTab[v].push(i);
                }
            }
        }
        return this;
    },
    
    /**
     * sort each bar of barplot using a distribution function <br>
     * param {function} fct - distribution function
     * */
    sortBarTab: function (fct) {
        console.log('sort')
        console.log(fct)
        if (typeof fct == "string"){
            var tmp = fct 
            fct = function(id){ 
                return self.m.clone(id).get(tmp)
            }
        }
        
        for (var i in this.barTab) {
            this.barTab[i].sort(function (a,b) {
                var va;
                try{
                    var va = fct(a);
                }catch(e){
                }
                var vb;
                try{
                    var vb = fct(b);
                }catch(e){}
                
                if (typeof va == "undefined") return (typeof vb == "undefined")  ? 0 :  -1;
                if (typeof vb == "undefined") return (typeof va == "undefined")  ? 0 :  1;
                        
                if (va.constructor === String) {
                    if (vb.constructor === String) return va.localeCompare(vb);
                    if (vb.constructor === Number ) return 1
                }
                
                if (va.constructor === Number) return (vb.constructor === Number ) ? (va-vb) : -1;
            });
        }
        
        return this;
    },
    
    /**
     * return the size of the biggest bar
     * @return {float} - size
     * */
    computeBarMax : function () {
        var bar_max = 0;
        for (var i in this.barTab) {
            var tmp = 0;
            for (var j in this.barTab[i]) {
                var cloneID = this.barTab[i][j]
                if ( this.m.clone(cloneID).id != "other") tmp += this.m.clone(cloneID).getSize();
            }
            if (tmp > bar_max) bar_max = tmp;
        }
        
        return bar_max;
    },
    
    /**
     * compute the position of each rectangles / labels and start the display
     * */
    computeBarTab : function () {
        var bar_max = this.computeBarMax();
        var tab_length = Object.keys(this.barTab).length;
        var width = Math.min(0.08, 0.8 / tab_length);
        
        
        //reset (TODO improve default position )
        for (var i in this.nodes) {
            this.nodes[i].bar_y = 0.5;
            this.nodes[i].bar_x = 1;
            this.nodes[i].bar_h = 0;
            this.nodes[i].bar_w = 0;
        }
        
        k=1 ;
        for (var i in this.barTab) {

            var y_pos = 0
            var x_pos = this.axisX.posBarLabel(k, tab_length)
            
            for (var j in this.barTab[i]){
                var cloneID = this.barTab[i][j]
                height = 0;
                if ( this.m.clone(cloneID).id != "other" & this.m.clone(cloneID).isActive() ) {
                    height = this.m.clone(cloneID).getSize()/bar_max;
                }
                y_pos += height;
                
                this.nodes[cloneID].bar_y = y_pos;
                this.nodes[cloneID].bar_x = x_pos;
                this.nodes[cloneID].bar_h = height;
                this.nodes[cloneID].bar_w = width;

            }
            k++;
        }
        this.axisY.computeCustomLabels(0, bar_max, "percent", false);
        this.axisX.computeCustomBarLabels(this.barTab)
        this.initGrid();
        this.drawBarTab(500);
        
        return this
    },

    /**
     * draw/move rectangles to their computed position
     * @param {integer} speed
     * */
    drawBarTab : function (speed) {
        var self = this;
        //redraw
        this.bar = this.bar_container.selectAll("rect")
            .data(this.nodes)
        this.bar_container.selectAll("rect")
            .transition()
            .duration(speed)
            .attr("id", function(d) {
                return "bar" + d.id;
            })
            .attr("width", function(d) { return d.bar_w*self.gridSizeW })
            .attr("x", function(d) { return (d.bar_x - d.bar_w/2)*self.gridSizeW + self.marge_left })
            .attr("height", function(d) { return d.bar_h*self.gridSizeH })
            .attr("y", function(d) { return (1-d.bar_y)*self.gridSizeH + self.marge_top })
            .style("fill", function(d) { return (self.m.clone(d.id).getColor()) })
            .attr("class", function(p) {
                if (!self.m.clone(p.id)
                    .isActive()) return "circle_hidden";
                if (self.m.clone(p.id)
                    .isSelected()){
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus circle_select";
                    return "circle_select";
                }
                if (self.m.clone(p.id)
                    .isFocus()) return "circle_focus";
                return "circle";
            })
    },

    /**
     * transition between bar graph and scatterplot mode
     * */
    endBar: function() {
        var self = this;
        
        this.bar_container.selectAll("rect")
            .transition()
            .duration(500)
            //use clone circle position to init the clone bar position
            .attr("width", function(d) { return d.r2*2 })
            .attr("x", function(d) { return d.x+self.marge_left-(d.r2) })
            .attr("height", function(d) { return d.r2*2 })
            .attr("y", function(d) { return d.y+self.marge_top-(d.r2) })
        this.node
            .attr("class", function(p) {
                return "circle_hidden";
            })
        
        this.axis_x_update(this.axisX.labels);
        this.axis_y_update(this.axisY.labels);
            
        setTimeout(function () {
            self.bar_container.selectAll("rect")
                .attr("class", function(p) {
                    return "circle_hidden";
            })
            self.update()
        },500)

        
    },

    /**
     * compute the height of a bar representing a given clone in the bar graph mode
     * @param {integer} cloneID - clone index
     * @return {float} height
     * */
    getBarHeight: function(cloneID) {
        var size = this.m.clone(cloneID)
            .getSize();
        return size / this.bar_max;
    },

    /**
     * compute the x pos of a bar representing a given clone in the bar graph mode
     * @param {integer} cloneID - clone index
     * @return {float} pos
     * */
    getBarPosition: function(cloneID) {
        for (var i = 0; i < this.vKey.length; i++) {
            for (var j = 0; j < this.bar_v[this.vKey[i]].clones.length; j++) {
                if (this.bar_v[this.vKey[i]].clones[j].id == cloneID)
                    return this.bar_v[this.vKey[i]].clones[j].pos;
            }
        }
    },
    
    /**
     * switch mode between bar and plot
     * */
    changeMode : function (mode) {
        this.changeSplitMethod(this.splitX, this.splitY, mode);
    },
    
    /**
     * build a system labels descriptor
     * */
    buildSystemGrid: function() {
        this.systemGrid = {
            "label": []
        }
        var n = this.m.system_available.length
        var h = this.resizeH
        var w = this.resizeW * 0.2

        //compute hidden position for unactivated germline (to avoid firework effect)
        for (var key in this.m.system_available) {
            var system = this.m.system_available[key]
            this.systemGrid[system] = {
                'x': 0.99,
                'y': 0.99
            }
        }

        //compute position for selected germline
        var i = 0;
        for (var key in this.m.system_available) {

            var system = this.m.system_available[key]

            var enabled = false
            if (this.m.system_selected.indexOf(system) != -1) enabled = true

            var xpos = 0.8

            if (system != this.m.germlineV.system) {
                this.systemGrid["label"].push({
                    "text": system,
                    "enabled": enabled,
                    "x": xpos + 0.01,
                    "y": ((i * 2) + 1) / (n * 2)
                })
            } else {
                this.systemGrid["label"].push({
                    "text": system,
                    "enabled": enabled,
                    "x": xpos,
                    "y": ((i * 2) + 1) / (n * 2)
                })
            }
            this.systemGrid[system].x = 0.92
            this.systemGrid[system].y = ((i * 2) + 1) / (n * 2)
            i++
        }
    },

    /**
     * resize the scatterplot to the size of the div parent element or to a given size
     * @param {float} [div_width]
     * @param {float} [div_height]
     * */
    resize: function(div_width, div_height) {
        var print = true
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            var div_height = div.offsetHeight
            var div_width = div.offsetWidth
            print = false
        }
        this.compute_size(div_width, div_height, print)
            //Attributions
        this.vis = d3.select("#" + this.id + "_svg")
            .attr("width", div_width)
            .attr("height", div_height)
        d3.select("#" + this.id + "_back")
            .attr("width", div_width)
            .attr("height", div_height);

        //Initialisation de la grille puis mise-à-jour
        this.initGrid()
            .updateClones()
            .updateMenu()
            .initGrid();
        
        if (this.splitX == "tsneX_system" || this.splitX == "tsneX"){
            this.changeSplitMethod(this.splitX, this.splitY, this.mode)
        }
    },
    
    /**
     * @param {float} [div_width]
     * @param {float} [div_height]
     * @param {float} [print]
     * */
    compute_size: function(div_width, div_height, print) {
        if (typeof div_height == 'undefined') {
            var div = document.getElementById(this.id)
            var div_height = div.offsetHeight
            var div_width = div.offsetWidth
        }
        //On prend la largeur de la div
        this.resizeW = div_width - this.marge_left - this.marge_right;
        //On prend la hauteur de la div
        this.resizeH = div_height - this.marge_top - this.marge_bot;

        if (this.splitX == "allele_v" || this.splitX == "gene_v" || this.splitX == "allele_j" || this.splitX == "gene_j" || this.splitX == "tsneX_system" ||
            (this.mode == "plot" & (this.splitY == "allele_v" || this.splitY == "gene_v" || this.splitY == "allele_j" || this.splitY == "gene_j"))) {
            this.use_system_grid = true;
            this.buildSystemGrid()
        } else {
            this.use_system_grid = false
            this.systemGrid = {}
        }

        if (!print && this.splitY != "bar" && this.use_system_grid && this.m.system_available.length > 1) {
            this.gridSizeW = 0.8 * this.resizeW;
            this.gridSizeH = 1 * this.resizeH;
        } else {
            this.gridSizeW = this.resizeW;
            this.gridSizeH = this.resizeH;
        }

        this.resizeCoef = Math.sqrt(this.resizeW * this.resizeH);
        if (this.resizeCoef < 0.1 || (this.resizeW * this.resizeH) < 0) this.resizeCoef = 0.1;

        return this;
    },

    /**
     * compute the position of the 500 next frame but don't display them <br>
     * (used for export a scatterplot screenshot without waiting for the clones have found a balance)
     * */
    fastForward: function() {
        this.force.stop()
        for (var i = 0; i < 500; i++) this.computeFrame()
        this.drawFrame()
    },

    /**
     * one animation step<br>
     * compute next frame and draws
     * */
    tick: function() {
        var self = this

        this.computeFrame()
            .drawFrame()

        //Calcul d'une frame (image / seconde)
        this.time1 = Date.now();
        if (this.fpsqueue.length === 10) {
            $("#fps")
                .innerHTML = d3.mean(this.fpsqueue)
                .toFixed(3);
            this.fpsqueue = [];
        }
        this.fpsqueue.push(Math.round(1000 / (this.time1 - this.time0)));
        this.time0 = this.time1;

    },

    /**
     * compute next position of each clones <br>
     * resolve collision
     * */
    computeFrame: function() {
        var self = this;

        this.active_node = this.node.filter(function(d, i) {
            return d.r2 > 0.1;
        });

        //mise a jour des rayons( maj progressive )
        this.node.each(this.updateRadius());

        this.active_node.each(this.debugNaN())
            //deplace le node vers son objectif
        this.active_node.each(this.move());
        //résolution des collisions
        var quad = d3.geom.quadtree(this.nodes)

        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].r1 > 0.1) {
                quad.visit(this.collide(this.nodes[i]));
            }
        }
        this.active_node.each(this.debugNaN())

        return this
    },

    /**
     * draw each clones
     * */
    drawFrame: function() {
        if (this.mode != "bar"){
            this.active_node
                //attribution des nouvelles positions/tailles
                .attr("cx", function(d) {
                    return (d3.mean(d.old_x) + self.marge_left);
                })
                .attr("cy", function(d) {
                    return (d3.mean(d.old_y) + self.marge_top);
                })
                .attr("r", function(d) {
                    return (d.r2);
                })
                .attr("title", function(d) {
                    return (self.m.clone(d.id)
                        .getName());
                })
        }
    },

    /**
     * move current clone's positions closer to their expected positions
     * */
    move: function() {
        self = this;
        return function(d) {
            d.old_x.push(d.x);
            d.old_x.shift();
            if (d.x != d.x2) {
                var delta = d.x2 - d.x;
                var s = ((d.r1 / self.resizeCoef))
                d.x += 0.015 * delta
            }
            d.old_y.push(d.y);
            d.old_y.shift();
            if (d.y != d.y2) {
                var delta = d.y2 - d.y;
                var s = ((d.r1 / self.resizeCoef))
                d.y += 0.015 * delta
            }
        }
    },


    /**
     * update current clone's radius closer to their expected radius
     * */
    updateRadius: function() {
        return function(d) {
            if (d.r1 != d.r2) {
                var delta = d.r1 - d.r2;
                d.r2 += 0.03 * delta;
                if (d.r2 < 0.01) d.r2 = 0;
            }
        }
    },

    /**
     * repair empty clone's position <br>
     * */
    debugNaN: function() {
        return function(d) {
            if (!isFinite(d.x)) {
                d.x = Math.random() * 500;
            }
            if (!isFinite(d.y)) {
                d.y = Math.random() * 500;
            }
        }
    },

    /**
     * resolve collision function
     * @param {node} node - d3js node for a clone
     * */
    collide: function(node) {
        var r = node.r2 + 30,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node) && quad.point.r1 != 0) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.r2 + quad.point.r2 + 2;
                if (l < r) {
                    var c1 = node.s
                    var c2 = quad.point.s
                    var w = (c2 / (c1 + c2))
                    l = (l - r) / l * w;
                    node.x -= x *= l;
                    node.y -= y *= l;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
    },

    /**
     * update all elements (resize / clones positions / axis / menu / labels / system labels)
     * */
    update: function() {
        var self = this;
        var startTime = new Date()
            .getTime();
        var elapsedTime = 0;

        this.compute_size()
            .initGrid()
            .updateClones()
            .updateMenu();

        //Donne des informations quant au temps de MàJ des données
        elapsedTime = new Date()
            .getTime() - startTime;
        console.log("update sp: " + elapsedTime + "ms");
    },

    /**
     * update all clones (color / position / axis)
     * */
    updateClones: function() {
        if (this.mode == "bar" && !this.reinit) {
            this.computeBarTab();
        }
        
        for (var i = 0; i < this.nodes.length; i++) {
            this.updateClone(i);
        }
        this.force.start();
        this.updateElemStyle();

        if (this.m.germlineV.system != this.system) {
            this.system = this.m.germlineV.system
            this.changeSplitMethod(this.splitX, this.splitY, this.mode)
        }
        return this;
    },
    
    /**
     * update(size/style/position) a list of selected clones <br>
     * scatterlot can't update only one clone
     * @param {integer[]} list - array of clone index
     * */
    updateElem: function(list) {
        this.update();
    },

    /** 
     * update color/style/position of a single clone
     * @param {integer} cloneID - clone index 
     * */
    updateClone: function(cloneID) {
        if (this.m.clone(cloneID)
            .isActive()) {

            if (this.m.clone(cloneID)
                .split) {
                for (var i = 0; i < this.m.clusters[cloneID].length; i++) {
                    var seqID = this.m.clusters[cloneID][i]
                    var size = this.m.clone(seqID)
                        .getSequenceSize();
                    this.nodes[seqID].s = size
                        //Math.pow(x,y) -> x**y
                    if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                    this.nodes[seqID].r1 = size
                }
            } else {
                for (var i = 0; i < this.m.clusters[cloneID].length; i++) {
                    var seqID = this.m.clusters[cloneID][i]
                    this.nodes[seqID].s = 0
                    this.nodes[seqID].r1 = 0
                }
                var size = this.m.clone(cloneID)
                    .getSize2();
                if (this.m.clusters[cloneID].length == 0) size = this.m.clone(cloneID)
                    .getSequenceSize();
                this.nodes[cloneID].s = size
                if (size != 0) size = this.resizeCoef * Math.pow((size + 0.001), (1 / 3)) / 25
                this.nodes[cloneID].r1 = size
            }

        } else {
            this.nodes[cloneID].r1 = 0
            this.nodes[cloneID].s = 0
        }
        var sys = this.m.clone(cloneID)
            .get('germline')
        if (this.use_system_grid && this.m.system == "multi" && typeof sys != 'undefined' && sys != this.m.germlineV.system) {
            this.nodes[cloneID].x2 = this.systemGrid[sys].x * this.resizeW;
            this.nodes[cloneID].y2 = this.systemGrid[sys].y * this.resizeH;
        } else {
            this.nodes[cloneID].x2 = this.axisX.pos(cloneID) * this.gridSizeW
            this.nodes[cloneID].y2 = this.axisY.pos(cloneID) * this.gridSizeH
        }

    },

    /**
     * update(style only) a list of selected clones
     * @param {integer[]} list - array of clone index
     * */
    updateElemStyle: function() {
        var self = this;
        if (this.mode == "bar") {
            this.updateBar();
        } else {
            this.node
                .attr("class", function(p) {
                    if (!self.m.clone(p.id)
                        .isActive()) return "circle_hidden";
                    if (self.m.clone(p.id)
                        .isSelected()){
                        if (self.m.clone(p.id)
                            .isFocus()) return "circle_focus circle_select";
                        return "circle_select";
                    }
                    if (self.m.clone(p.id)
                        .isFocus()) return "circle_focus";
                    return "circle";
                })
                .style("fill", function(d) {
                    return (self.m.clone(d.id)
                        .getColor());
                })
        }
        //Activation des liens "utiles" pour le graphe
        if (this.reinit) this.activeLine();
    },

    /**
     * set default axisX/Y
     * */
    initGrid: function() {

        self = this;

        //Réinitialisation de la grille si les légendes sont placées sur "graph", mais que la répartition par distance d'édition est désactivée
        if ((self.splitX == "graph" || self.splitY == "graph" || self.splitX == "dbscan" ||  self.splitY == "dbscan") && self.reinit == false) {
            this.splitX = "gene_v";
            this.splitY = "gene_j";
        }

        if (!self.reinit) this.axis_x_update(this.axisX.labels);
        if (!self.reinit) this.axis_y_update(this.axisY.labels);
        if (!self.reinit) this.system_label_update(this.systemGrid.label);

        return this;
    },

    /**
     * retrieve and apply selected splitMethod in the axisX menu selector
     * */
    changeXaxis: function() {
        var elem = this.select_x;
        if (this.checkGraphMethod(elem.value)) return;
        this.changeSplitMethod(elem.value, this.splitY, this.mode);
        this.select_preset.selectedIndex = 0
    },

    /**
     * retrieve and apply selected splitMethod in the axisY menu selector
     * */
    changeYaxis: function() {
        var elem = this.select_y;
        if (this.checkGraphMethod(elem.value)) return;
        this.changeSplitMethod(this.splitX, elem.value, this.mode);
        this.select_preset.selectedIndex = 0
    },
    
    /**
     * retrieve and apply selected preset in the preset menu selector
     * */
    changePreset: function(){
        var elem = this.select_preset;
        this.changeSplitMethod(this.preset[elem.value].x, this.preset[elem.value].y, this.preset[elem.value].mode);
    },

    /* Fonction permettant de mettre à jour de l'axe des X
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de X)
     * */
    axis_x_update: function(data) {

        var self = this;

        this.label_update();
        
        //detect label size
        var label_width = 0;
        var line = 0
        var sub_line = 0

        for (var i = 0; i < data.length; i++) {
            if (data[i].type == "line") {
                if (data[i].text.length > label_width) {
                    label_width = data[i].text.length;
                }
                line++
            } else {
                sub_line++
            }
        }

        label_width = (label_width * 8)
        var space = (this.gridSizeW / line) / label_width
            //var count=space

        var className = "sp_legend"
        if (space < 1.1) {
            this.rotation_x = 320;
            this.text_position_x = 60;
            this.sub_text_position_x = 80;
            className = "sp_rotated_legend";
        } else {
            this.rotation_x = 0;
            className = "sp_legend";
            this.text_position_x = 30;
            this.sub_text_position_x = 45;
        }

        //LEGENDE
        leg = this.axis_x_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg.on("click", function(d){
            if (!d3.event.ctrlKey) 
                self.m.unselectAll()
            var listToSelect = [];
            var halfRangeColumn = 0.5;
            if (self.axisX.labels.length>1)
                halfRangeColumn = Math.abs((self.axisX.labels[1].pos - self.axisX.labels[0].pos)/2);
            for (n=0; n<self.nodes.length; n++){
                if (self.m.clones[n].germline == (self.m.germlineV.system))
                    if (Math.abs(self.axisX.pos(self.nodes[n]) - d.pos) < halfRangeColumn)
                        listToSelect.push(self.nodes[n]);
            }
                self.m.multiSelect(listToSelect);
           })
            .attr("x", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
            })
            .attr("y", function(d) {
                if (d.type == "subline") return self.sub_text_position_x
                else return self.text_position_x
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", function(d) {
                return className;
                /*
                * TODO
                if ( d.type=="line" ){
                count++
                if (self.coordinates[0] > ((self.resizeW*d.pos+self.marge_left)-(label_width/4) ) &&
                self.coordinates[0] < ((self.resizeW*d.pos+self.marge_left)+(label_width/4) )
                ){
                return "sp_legend_focus";
                }
                if (count >= space){
                count=0
                return "sp_legend";
                }else{
                return "sp_hidden_legend";
                }
                }else{ return "sp_legend";}
                */
            })
            .attr("transform", function(d) {
                var y = self.text_position_x
                if (d.type == "subline") y = self.sub_text_position_x
                return "rotate(" + self.rotation_x + " " + (self.gridSizeW * d.pos + self.marge_left) + " " + y + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitX == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //AXIS
        lines = this.axis_x_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
            })
            .attr("x2", function(d) {
                return self.gridSizeW * d.pos + self.marge_left;
            })
            .attr("y1", function(d) {
                return self.marge_top;
            })
            .attr("y2", function(d) {
                return self.resizeH + self.marge_top;
            })
            .style("stroke", function(d) {
                return null;
            })
            .attr("class", function(d) {
                if (d.type == "subline") {
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function(d) {
                if (self.m.colorMethod == "V" && self.splitX == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitX == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },

    /* Fonction permettant de mettre à jour de l'axe des Y
     * @param data - Un tableau d'objets, concernant les données et les légendages (pour l'axe de Y)
     * */
    axis_y_update: function(data) {

        self = this;

        this.label_update();
        
        //LEGENDE
        leg = this.axis_y_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove();
        leg.on("click", function(d){
            if (self.mode !="bar"){
                if (!d3.event.ctrlKey) 
                    self.m.unselectAll()
                var listToSelect = [];
                var halfRangeLine = 0.5;
                if (self.axisY.labels.length>1)
                    halfRangeLine = Math.abs((self.axisY.labels[0].pos - self.axisY.labels[1].pos)/2);
                for (n=0; n<self.nodes.length; n++){
                    if (self.m.clones[n].germline == (self.m.germlineV.system))
                        if (Math.abs(self.axisY.pos(n) - d.pos) < halfRangeLine)
                            listToSelect.push(n);
                        }
                self.m.multiSelect(listToSelect);
                }
            })

            .attr("x", function(d) {
                if (d.type == "subline") return self.sub_text_position_y;
                else return self.text_position_y;
            })
            .attr("y", function(d) {
                return (self.resizeH * d.pos + self.marge_top);
            })
            .text(function(d) {
                return d.text;
            })
            .attr("class", "sp_legend")
            .attr("transform", function(d) {
                var x = self.text_position_y
                if (d.type == "subline") x = self.sub_text_position_y
                return "rotate(" + self.rotation_y + " " + x + " " + (self.resizeH * d.pos + self.marge_top) + ")"
            })
            .style("fill", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

        //AXIS
        lines = this.axis_y_container.selectAll("line")
            .data(data);
        lines.enter()
            .append("line");
        lines.exit()
            .remove();
        lines
            .attr("x1", function(d) {
                return self.marge_left;
            })
            .attr("x2", function(d) {
                return self.gridSizeW + self.marge_left;
            })
            .attr("y1", function(d) {
                return self.gridSizeH * d.pos + self.marge_top;
            })
            .attr("y2", function(d) {
                return self.gridSizeH * d.pos + self.marge_top;
            })
            .style("stroke", function(d) {
                return null;
            })
            .attr("class", function(d) {
                if (d.type == "subline") {
                    if (self.splitY != "allele_j" && self.splitY != "allele_v" && self.splitY != "allele_v_used") return "sp_subline_hidden";
                    return "sp_subline";
                }
                return "sp_line";
            })
            .style("stroke", function(d) {
                if (self.m.colorMethod == "V" && self.splitY == "gene_v" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                if (self.m.colorMethod == "J" && self.splitY == "gene_j" && (typeof(d.geneColor) != "undefined")) return d.geneColor;
                return null;
            });

    },
    
    label_update : function () {
        
        var data = [
            {x:(this.gridSizeW/2)+this.marge_left, y:12, text:this.available_axis[this.splitX].label, rotation:0 },
            {y:(this.gridSizeH/2)+this.marge_top,  x:12, text:this.available_axis[this.splitY].label, rotation:270}
        ]
        
        leg = this.axis_container.selectAll("text")
            .data(data);
        leg.enter()
            .append("text");
        leg.exit()
            .remove()
        leg.attr("x", function(d) {return d.x})
            .attr("y", function(d) {return d.y})
            .text(function(d) {return d.text})
            .attr("class", "sp_legend2")
            .attr("transform", function(d) {
                if (d.rotate != 0) return "rotate(" + d.rotation + " " + d.x + " " + d.y + ")"
            })
    },

    /**
     * redraw labels for system (TRG/IGH/...)
     * @param {object} data - system label descriptor
     * */
    system_label_update: function(data) {
        self = this;

        if (typeof data == "undefined" || self.m.system_available.length <= 1) {
            this.label_container.style("display", "none");
        } else {
            this.label_container.style("display", "");
            //LEGENDE
            leg = this.label_container.selectAll(".sp_system_label")
                .data(data);
            leg.enter()
                .append("div");
            leg.exit()
                .remove();
            leg
                .style("left", function(d) {
                    return "" + (d.x * self.resizeW + self.marge_left) + "px"
                })
                .style("top", function(d) {
                    return "" + (d.y * self.resizeH + self.marge_top) + "px"
                })
                .html(function(d) {
                    return "<div class='sp_system'>" + self.m.systemBox(d.text)
                        .outerHTML + " " + d.text + "</div>"
                })
                .on("click", function(d) {
                    self.m.changeGermline(d.text, false) // How can we get the shiftKey here ?
                })
                .attr("class", function(d) {
                    if (d.enabled) return "sp_system_label"
                    return "sp_system_label inactive"
                })
        }
    },

    /** 
     * compute both axis with a new splitmethod (list of splitmethod in this.available_axis) <br>
     * and a mode ( 'bar' or 'scatterplot' )
     * @param {string} splitX - splitMethod
     * @param {string} splitY - splitMethod
     * @param {string} mode 
     * */
    changeSplitMethod: function(splitX, splitY, mode) {
        var self = this;
        
        if (mode == "bar" && mode != this.mode) {
            this.endPlot();
            this.initBar();
        }
        
        var endbar = false;
        if (mode != "bar" && this.mode == "bar") {
            endbar = true;
        }
        
        this.splitX = splitX;
        this.splitY = splitY;
        this.mode = mode;
        this.compute_size();

        this.updateAxis(this.axisX, this.splitX);
        this.updateAxis(this.axisY, this.splitY);
        
        if (this.mode == "bar"){
            this.updateBar();
        }
        
        if (endbar){
            this.endBar();
        }else{
            this.update();
        }

        if (typeof this.m.graph != "undefined") {
            this.m.graph.setOtherVisibility(this.splitX == "otherSize" || this.splitY == "otherSize")
        }

        if (splitX == "tsneX" || splitX == "tsneX_system"){
            if (!this.tsne_ready){
                console.log("plop")
                this.tsne_ready=true;
                this.m.similarity_builder.init(function(){self.changeSplitMethod(splitX, splitY, mode)});
                return 0;
            }
        }
    },

    /**
     * compute one axis with a given splitMethod (list of splitmethod in this.available_axis)
     * @param {Axis} axis
     * @param {string} splitMethod
     * */
    updateAxis: function(axis, splitMethod) {
        switch (splitMethod) {
            case "allele_v" :
                axis.useGermline(this.m.germlineV, "V", true)
                break;
            case "gene_v" :
                axis.useGermline(this.m.germlineV, "V", false)
                break;
            case "allele_j" :
                axis.useGermline(this.m.germlineJ, "J", true)
                break;
            case "gene_j" :
                axis.useGermline(this.m.germlineJ, "J", false)
                break;
            default :
                if (typeof this.available_axis[splitMethod]){
                    var a = this.available_axis[splitMethod];
                    axis.custom(a.fct, a.min, a.max, a.output, a.log)
                }
            break;
        }
    },

    /**
     * check and put the correct currently 
      axis for axisX/Y menu <br>
     * */
    updateMenu: function() {
        var select_x = 0;
        var select_y = 0
        var i=0;
        for (var key in this.available_axis) {
            if (key == this.splitX) select_x = i
            if (key == this.splitY) select_y = i
            i++;
        }
        this.select_x.selectedIndex = select_x
        this.select_y.selectedIndex = select_y
        $(".sp_menu_icon").removeClass("sp_selected_mode");
        $("#"+this.id+"_"+this.mode).addClass("sp_selected_mode");

        return this;
    },

    /** 
     * transition between scatterplot and bar graph 
     * */
    endPlot: function() {
        var self = this;
        this.node
            .transition()
            .duration(500)
            .attr("class", function(p) {
                return "circle_hidden";
            })
    },

    /**
     * onmousedown event <br>
     * start drawing a selector at this position
     * */
    activeSelector: function() {
        var self = this;
        this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
            .node());

        if (this.active_move) {

            //Initialisation of the movement
            this.positionToMove.x = this.coordinates[0];
            this.positionToMove.y = this.coordinates[1];
            this.positionToMove.originx = this.coordinates[0];
            this.positionToMove.originy = this.coordinates[1];

            //Simple modification to the CSS of the mouse
            document.body.style.cursor = "move";

        } else {

            //Initialisation du sélecteur
            this.selector
                .attr("originx", this.coordinates[0])
                .attr("originy", this.coordinates[1])
                .attr("x", this.coordinates[0])
                .attr("y", this.coordinates[1])
                .attr("width", 0)
                .attr("height", 0)
                .style("display", "");

        }

        this.active_selector = true;
    },

    /**
     * onmousemove event <br>
     * redraw the selector every time the mouse move till the click release
     * */
    updateSelector: function() {
        this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
            .node());

        //Active selector -> activeSelector() function
        if (this.active_selector) {

            /*Movement of all nodes, with mouse move*/
            if (this.active_move) {

                this.positionToMove.x = this.coordinates[0];
                this.positionToMove.y = this.coordinates[1];

                var width = this.positionToMove.originx - this.positionToMove.x;
                var height = this.positionToMove.originy - this.positionToMove.y;

                this.fixedAllClones(false);

                var movementWidth = -(Math.abs(0.5 * width / 100) * width);
                var movementHeight = -(Math.abs(0.5 * height / 100) * height);

                for (var i = 0; i < this.nodes.length; i++) {
                    this.nodes[i].x += movementWidth;
                    this.nodes[i].px += movementWidth;
                    this.nodes[i].y += movementHeight;
                    this.nodes[i].py += movementHeight;
                }

                if (this.dbscanActive) this.addNextPositionsToClones(movementWidth, movementHeight);

                this.positionToMove.originx += movementWidth;
                this.positionToMove.originy += movementHeight;

            }
            /*Nodes selection*/
            else {

                var x = this.selector.attr("originx");
                var y = this.selector.attr("originy");

                var width = this.coordinates[0] - x;
                var height = this.coordinates[1] - y;

                if (width > 5) {
                    this.selector.attr("width", width - 3)
                        .attr("x", x)
                } else
                if (width < -5) {
                    this.selector
                        .attr("width", -width)
                        .attr("x", this.coordinates[0] + 3)
                } else {
                    this.selector.attr("width", 0)
                        .attr("x", x)
                }

                if (height > 5) {
                    this.selector.attr("height", height - 3)
                        .attr("y", y)
                } else
                if (height < -5) {
                    this.selector
                        .attr("height", -height)
                        .attr("y", this.coordinates[1] + 3)
                } else {
                    this.selector.attr("height", 0)
                        .attr("y", y)
                }
            }
        }
    },

    /**
     * onmouserelease event<br>
     * detect and select all clones under the selector
     * @param {Event} e
     * */
    stopSelector: function(e) {
        if (this.active_selector) {

            this.coordinates = d3.mouse(d3.select("#" + this.id + "_svg")
                .node());

            if (this.active_move) {

                //Selector disabled
                this.cancelSelector();

                //Set the CSS of the mouse to "default"
                document.body.style.cursor = "default";

            }
            /*Sélection*/
            else {
                var nodes_selected = []
                var x1 = parseInt(this.selector.attr("x"))
                var x2 = x1 + parseInt(this.selector.attr("width"))
                var y1 = parseInt(this.selector.attr("y"))
                var y2 = y1 + parseInt(this.selector.attr("height"))
                
                
                for (var i = 0; i < this.nodes.length; i++) {
                    var node = this.nodes[i]
                    var clone = this.m.clone(i)
                    if (this.mode != "bar"){
                        var node_x = node.x + this.marge_left
                        var node_y = node.y + this.marge_top
                    }else{
                        //TODO bar multi-selector
                    }
                    
                    if (clone.isActive() && (clone.getSize() || clone.getSequenceSize()) && node_x > x1 && node_x < x2 && node_y > y1 && node_y < y2)
                        nodes_selected.push(i);
                }

                this.selector
                    .style("display", "none")
                    .attr("width", 0)
                    .attr("height", 0)
                this.active_selector = false;

                if (!(d3.event.ctrlKey || d3.event.metakey)) this.m.unselectAll()
                this.m.multiSelect(nodes_selected)
            }
        }
    },

    /**
     * click event, select/unselect clones <br>
     * @param {integer} cloneID - clone index
     * */
    clickNode: function(cloneID) {
        if (!d3.event.ctrlKey) this.m.unselectAll()
        this.m.select(cloneID)
    },

    /**
     * cancel current select box
     * */
    cancelSelector: function() {
        this.selector
            .style("display", "none")
            .attr("width", 0)
            .attr("height", 0)
            //On met le sélecteur à false -> annulation
        this.active_selector = false;

        //Si sélection sur le document, on efface tout
        if (document.selection) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection()
                .removeAllRanges();
        }
    },
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /*********************************************
     * DBSCAN
     * *******************************************/
    
    
    
    
    
    /* Function which permits to modify the D3JS physic engine, compared to the graph distribution
     * */
    graphMotor: function() {
        var self = this;
        this.force
            //Added greater 'alpha' to obtains a larger nodes animation
            .alpha(100)
            //Gravity only for Edit Distance - no gravity to DBSCAN for fixed nodes in the SVG frame (without charge between nodes)
            .gravity(function(d) {
                if (self.dbscanActive) return 0;
                else return -0.001
            })
            //Added edges array (different according to the graphe visualization)
            .links(self.edge)
            /*
            LinkDistance:
                -Edit Distance = Distance power 1.3, with zoom and coeff parameters
                -DBSCAN = 2 choices:
                                    -> CORE node = default length (see DBSCANLength) and zoom + coeff parameters
                                    -> NEAR node = attribution  of a superior length
            */
            .linkDistance(function(d) {
                if (self.dbscanActive && (self.m.clone(d.source)
                        .tagCluster == "CORE" || self.m.clone(d.target)
                        .tagCluster == "CORE"))
                    return (self.DBSCANLength * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
                else {
                    //Added length between nodes to let the CORE node at the middle of the cluster
                    if (self.dbscanActive) return (8 * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
                }
                if (!self.dbscanActive) return (Math.pow(d.len, 1.4) * self.mouseZoom * (self.resizeCoef / ((20 * self.resizeCoef) / 100)));
            })
            .charge(function(d) {
                if (self.reloadCharge) {
                    return -1;
                }
            }) //Allows to act to the DBSCAN visualization -> clusters with length not equals to 1 are rejected -> independant clusters = independant graphs 
            .linkStrength(1) //Added strong strength
            .size([self.resizeW - 50, self.resizeH - 50]);
        this.setGraphLinks(); //Edges initialization in the graph
    },

    /* Function which allows to initialize the edges creation, for the D3JS engine
     * */
    setGraphLinks: function() {
        var self = this;
        //Add links selected, added data
        var allLinks = this.grpLinks
            .selectAll("line")
            //Attributing to each 'line' object a data contains in the edges array, give with the engine initialization
            .data(self.edge);
        //Added real edges (see setEdgeContainer developer documentation)
        this.setEdgeContainer(allLinks);
    },

    /*  Function which allow to initialize/re-initialize the edges array of the graph, and unset lines
     * */
    unsetGraphLinks: function() {
        this.force.links([]); //The engine not contains links
        this.grpLinks.selectAll("line")
            .remove(); //Useless links are delete
    },

    /* Function which allows to re-initialize the D3JS engine, according to the visualization
     * -> If visualization 'DBSCAN' -> New configuration fo the physic engine (see 'graphMotor')
     * -> Else, configuration by default of the engine (see 'init_motor')
     * */
    reinit_motor: function() {
        this.m.resetClusters();
        if (!this.reinit) {
            //The configuration of the engine is active
            this.reinit = true;
            //All the nodes positions are saved
            if (this.canSavePositions)
                this.saveInitialPositions();
            //Permission to save all positions is now delete - in order to not save initial positions of nodes when switching: DBSCAN -> Edit Distance OR Edit Distance -> DBSCAN
            this.canSavePositions = false;
            //Re-init of X/Y axis
            this.switchInitMenu();
            /* Relaunch of the physic engine ->
             * If DBSCAN mode is activated, we compute the DBSCAN object
             * Else, relaunch of the engine for Edit Distance visualization 
             */
            if (this.dbscanActive) {
                this.activeSliderDistanceMax(false);
                this.runGraphVisualization("dbscan");
            } else this.runGraphVisualization("edit_distance");
            //Charge disabled
            this.reloadCharge = false;
            //Activation of the slider to move the distanceMax parameter, IF AND ONLY IF the Edit Distance visualization is activated
            if (!this.dbscanActive) {
                this.activeSliderDistanceMax(true);
            }
        } else {
            //Graph mode disabled
            this.reinit = false;
            //Reloading of the charge
            this.reloadCharge = true;
            //Allow to save all nodes
            this.canSavePositions = true;
            //Re-init grid (for 'normal' distribution)
            this.initGrid();
            //Re-init of X/Y axis menu (see switchInitMenu doc)
            this.switchInitMenu();
            //Motor by default
            this.initMotor();
            //Reloading of the initial positions of nodes
            this.reinitInitialPositions();
            //Reloading of physic engine
            this.force.start();
            //Reloading of graph distribution axis
            this.m.update();
            //Edit Distance slider disabled
            this.activeSliderDistanceMax(false);
        }
    },

    /* Function which allows to run a graph visualization
     * @param viewing: the visualization given
     */
    runGraphVisualization: function(viewing) {
        //All the links are now erased
        this.unsetGraphLinks();
        //Compute edges, according to the visualization given
        switch (viewing) {
            case "dbscan":
                this.computeDBSCANEdges();
                break;
            case "edit_distance":
                this.computeEditDistanceEdges();
                break;
        }
        //Re-init the physic engine
        this.graphMotor();
        //Added color to edges, according to the visualization given
        this.addColorEdge();
        //We allow to separate clusters
        this.reloadCharge = true;
        //Reload the physic engine
        this.force.start();
        //Charge disabled -> no separation of clusters by charge
        this.reloadCharge = false;
    },

    /* Function which allows to create physically edges (see D3JS developer documentation on enter() and remove())
     * @allEdges: array of all edges
     */
    setEdgeContainer: function(allEdges) {
        //Added SVG 'line' element -> "line_active" 'cause no apparition of links - links will be active when manual selection of one or more clone(s)
        this.edgeContainer = allEdges.enter()
            .append("svg:line")
            .attr("class", "line_inactive")
            .on("mouseover", function(d) {
                self.m.focusEdge(d);
            });
    },

    /* Function which permits to add a color for each object which is contains in the initial edges array
     */
    addColorEdge: function() {
        //DBSCAN visualization case
        if (this.dbscanActive) {
            for (var i = 0; i < this.edge.length; i++) {
                //Yellow color attributed to edges which have source or target, with tag 'CORE'
                if (this.m.clone(this.edge[i].source)
                    .tagCluster == "CORE" || this.m.clone(this.edge[i].target)
                    .tagCluster == "CORE")
                    this.edge[i].color = "yellow";
                else
                //Red color attributed to edges which have source or target, with tag 'NEAR' (neighbors)
                if (this.m.clone(this.edge[i].source)
                    .tagCluster == "NEAR" || this.m.clone(this.edge[i].target)
                    .tagCluster == "NEAR")
                    this.edge[i].color = "red";
            }
        }
        //Edit Distance visualization case
        else {
            for (var i = 0; i < this.edge.length; i++) {
                //If the link's length is lower than distanceMax, color the link
                if (this.edge[i].len <= this.distanceMax)
                //colorGenerator usage for color red (0) to blue (270), by gap: 270/distanceMax
                    this.edge[i].color = colorGenerator((270 / this.distanceMax) * this.edge[i].len);
                //If the link is not interesting, we attribute the white color (usefull for the activeAllLine() function)
                else this.edge[i].color = "white";
            }
        }
    },

    /* Function which allows to compute usefull edges in dataset, for the DBSCAN graph visualization
     */
    computeDBSCANEdges: function() {
        this.edge = self.keepUsefullEdgesForDBSCANGraph(self.allEdges);
    },

    /* Function which allows to compute usefull edges in dataset, for the Edit Distance graph visualization
     */
    computeEditDistanceEdges: function() {
        this.edge = self.keepUsefullEdgesForEditDistanceGraph(self.allEdges);
    },

    /* Function which allows to keep only edges which concerns nodes in specific cluster -> verification done to see if source and target is in the same cluster
       @param tmp: array of all edges
     */
    keepUsefullEdgesForDBSCANGraph: function(tmp) {
        var returnedTab = [];
        if (typeof tmp != 'undefined') {
            for (var i = 0; i < tmp.length; i++) {
                if (this.m.clone(tmp[i].source)
                    .cluster == this.m.clone(tmp[i].target)
                    .cluster) {
                    returnedTab.push(tmp[i]);
                }
            }
        }
        return returnedTab;
    },

    /* Function which allows to keep only edges which length is lower than distanceMax
       @param tmp: array of all edges
     */
    keepUsefullEdgesForEditDistanceGraph: function(tmp) {
        var returnedTab = [];
        if (typeof tmp != 'undefined') {
            //Sorted array, according to growing edges length
            tmp.sort(function(a, b) {
                if (a.len < b.len) return -1;
                if (a.len > b.len) return 1;
                return 0
            });
            for (var i = 0; i < tmp.length; i++) {
                //Keep only edges lower or equals than distanceMax
                if (tmp[i].len <= this.distanceMax)
                    returnedTab.push(tmp[i]);
                else
                    break;
            }
        }
        return returnedTab
    },

    
    /* Function which allows to update edges of graph
     * */
    updateGraph: function() {
        this.setGraphLinks();
    },
    
    /*Function which allows to switch between initial menu and graph menu*/
    switchInitMenu: function() {
        var axis_select_x = document.getElementsByClassName("axis_select_x");
        var axis_select_y = document.getElementsByClassName("axis_select_y");
        var graph_selector = document.getElementsByClassName("axis_select_graph");
        for (var i = 0; i < axis_select_x.length; i++)
            axis_select_x[i].style.display = this.reinit ? "none" : "block";
        for (var i = 0; i < axis_select_y.length; i++)
            axis_select_y[i].style.display = this.reinit ? "none" : "block";
        for (var i = 0; i < graph_selector.length; i++)
            graph_selector[i].style.display = this.reinit ? "block" : "none";
    },
    
    /* Function which allows to verify if we can switch to an accessible distribution
     * @value: dbscan / graph, according to the visualization hope
     */
    checkGraphMethod: function(value) {
        switch (value) {
            case 'dbscan':
                this.changeSplitMethod('dbscan', 'dbscan');
                return true;
            case 'graph':
                this.changeSplitMethod('graph', 'graph');
                return true;
        }
        return false;
    },
    
        /* Function which allows to add a stroke attribute to all edges
     */
    addColor: function() {
        this.edgeContainer
            .style("stroke", function(d) {
                return d.color;
            });
    },

    /*Function which permits to compute and add edges positions, according to source and target nodes
     */
    addPosition: function() {
        var self = this;
        //self.marge = margin top and left given in the scatterPlot
        this.edgeContainer
            //Awarding of the source position
            .attr("x1", function(d) {
                return (d.source.px + self.marge_left);
            })
            .attr("y1", function(d) {
                return (d.source.py + self.marge_top);
            })
            //Awarding of the target position
            .attr("x2", function(d) {
                return (d.target.px + self.marge_left);
            })
            .attr("y2", function(d) {
                return (d.target.py + self.marge_top);
            });
    },
    
    
   /**
     * Function which allows to re-init all points to a (no-)fixed position
     * @bool: True -> fix / False -> no-fix
     */
    fixedAllClones: function(bool) {
        for (var i = 0; i < this.nodes.length; i++)
            this.nodes[i].fixed = bool;
    },

    /* Function which permits to force all no-clustered clones, to return at their initial position
     */
    forceNodesToStayInInitialPosition: function() {
        for (var i = 0; i < this.m.clones.length; i++) {
            if (this.m.dbscan.clusters[this.m.clone(i)
                    .cluster].length == 1) {
                //Calcul du delta
                var x = this.nodes[i].x;
                var y = this.nodes[i].y;
                var deltaX = this.initialPositions[i].initPosX - x;
                var deltaY = this.initialPositions[i].initPosY - y;
                this.nodes[i].x += 5 * deltaX / 100;
                this.nodes[i].y += 5 * deltaY / 100;
            }
        }
    },

    /* Save clones positions in object which contains x/y coordinates (usefull for init_motor -> graphMotor)
     * Usefull function to force clones to return at their initial position IF the clone is not in a cluster, for the DBSCAN visualization
     */
    saveInitialPositions: function() {
        function newObject(x, y) {
            this.initPosX = x;
            this.initPosY = y;
        };
        for (var i = 0; i < this.nodes.length; i++) {
            this.initialPositions.push(new newObject(this.nodes[i].x, this.nodes[i].y));
        }
    },

    /* Function which permits to add X/Y margins to the initialPositions array (which contains initial positions of all nodes) - usefull for the selector movements
     * @marginX: margin left
     * @marginY: margin top
     */
    addNextPositionsToClones: function(marginX, marginY) {
        for (var i = 0; i < this.nodes.length; i++) {
            //Added X margin
            this.initialPositions[i].initPosX += marginX;
            //Added Y margin
            this.initialPositions[i].initPosY += marginY;
        }
    },

    /* Function which re-init initial positions of all clones
     */
    reinitInitialPositions: function() {
        this.initialPositions = [];
    },

    /* Function which allow to vary the max distance given between two clones
     * @distanceMax: the new distanceMax
     */
    displayDistanceMax: function(distanceMax) {
        //Replacement of the distanceMax attribute, if distanceMax parameter is not undefined
        distanceMax = typeof(distanceMax) != "undefined" ? distanceMax : this.distanceMax;
        this.distanceMax = distanceMax;

        //Disable and active slider -> display value of the slider
        this.activeSliderDistanceMax(false);
        this.activeSliderDistanceMax(true);

        var display_container = document.getElementById('distanceMax_slider');
        if (display_container != null) {
            display_container.value = distanceMax;
        }

        //Compute and display EditDistance visualization
        this.runGraphVisualization("edit_distance");

        //Update the style of all elements
        this.updateElemStyle();
    },

    /* Activation/Disactivation of the distanceMax display slider
     * @bool: True -> on / False -> off
     */
    activeSliderDistanceMax: function(bool) {
        var slider = document.getElementById("displayMax_slider");
        this.m.changeSliderEditDistanceValue(bool, this.distanceMax);
        bool ? slider.style.display = "" : slider.style.display = "none";
    },

    /* Function which allow to activate the opacity of a specific clone
     */
    activeLine: function() {
        var self = this;
        var selected = self.m.getSelected()
        if (selected.length > 0) {
            this.grpLinks.selectAll("line")
                .attr("class", function(d) {
                    if ((selected.indexOf(d.source.id) >= 0 || sselected.indexOf(d.target.id) >= 0) && (self.m.clone(d.source)
                            .isActive() && self.m.clone(d.target)
                            .isActive())) return "line_active";
                    else return "line_inactive"
                });
        } else this.activeAllLine(false);
    },

    /* Function which allows to activate/disactivate all lines which are contains in the scatterPlot
     * @bool: True -> active all / False -> disactive all
     */
    activeAllLine: function(bool) {
        var self = this;
        this.grpLinks.selectAll("line")
            .attr("class", bool ? "line_active" : "line_inactive");
    }


}
ScatterPlot.prototype = $.extend(Object.create(View.prototype), ScatterPlot.prototype);