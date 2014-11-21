/*
* This file is part of "Vidjil" <http://bioinfo.lifl.fr/vidjil>, V(D)J repertoire browsing and analysis
* Copyright (C) 2014 by Carette Antonin <antonin.carette@etudiant.univ-lille1.fr> and the Vidjil Team
* Bonsai bioinformatics at LIFL (UMR CNRS 8022, Université Lille) and Inria Lille
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

function Shortcut () {
        this.init()
}

Shortcut.prototype = {
    
    init : function () {
        var self = this
        document.onkeydown = function (e) { self.checkKey(e); }
        document.onkeyup = function (e) { sp.active_move = false; }
    },
    
    checkKey : function (e) {
        e = e || window.event;
        if (document.activeElement.id == ""){
            e.preventDefault()
                
            var key = e.keyCode;
            if (key==0) key = e.which

            switch(key) {
                case 37 :   //left arrow
                    m.previousTime()
                    break;
                case 39 :   //right arrow
                    m.nextTime()
                    break;
                case 83 :   //ctrl+s
                    if (e.ctrlKey || e.metakey) db.save_analysis()
                    break;
                case 65 :   //ctrl+a
                    if (e.ctrlKey || e.metakey){
                        var d_m = $("#debug_menu")
                        if (d_m.css("display") == "none"){
                            $("#debug_menu").css("display", "");
                        }else{
                            $("#debug_menu").css("display", "none");
                        }
                    }
                default:
            }
        }
        
        if (e.altKey && sp.reinit) {
            sp.active_move = true;
        }
        
    }
    
}
