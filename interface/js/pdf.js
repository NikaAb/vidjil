 /*
 function extractSVG(id){
    
    var html = d3.select("#"+id)
      .attr("title", "test")
      .attr("version", 1.1)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .node().parentNode.innerHTML;

    d3.select("#popup-msg").append("div")
      .append("img")
      .attr("src", "data:image/svg+xml;base64,"+ btoa(html));
	
    popupMsg("plop");
	
  }

  function testPDF(){

    //récupération du node du graphique
    var node = d3.select("#svg2")
    .attr("title", "test")
    .attr("version", 1.1)
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .node();
    
    //extraction du code SVG 
    var s = new XMLSerializer();
    var xmlString = s.serializeToString(node);
    
    //calcul du rescale a effectuer
    var width=document.getElementById("svg2").getAttribute("width");
    var height=document.getElementById("svg2").getAttribute("height");
    var nWidth=3000;
    var nHeight=1500;
    var dWidth = nWidth/width;
    var dHeight = nHeight/height;
    
    //application du rescale
    xmlString = xmlString.replace(width, nWidth);   
    xmlString = xmlString.replace(height, nHeight);   
    xmlString = xmlString.replace('<svg ', '<svg transform="scale(' + dWidth + ' ' + dHeight + ')" ');   
    
    //TODO changement de style pour la version PDF
    // + gestion non-scaling-stroke vector effect + font
    xmlString = xmlString.replace(new RegExp(colorStyle.c01, 'g'), pdfStyle.c01);
    xmlString = xmlString.replace(new RegExp(colorStyle.c02, 'g'), pdfStyle.c02);
    xmlString = xmlString.replace(new RegExp(colorStyle.c03, 'g'), pdfStyle.c03);
    xmlString = xmlString.replace(new RegExp(colorStyle.c04, 'g'), pdfStyle.c04);
    xmlString = xmlString.replace(new RegExp(colorStyle.c05, 'g'), pdfStyle.c05);
    xmlString = xmlString.replace(new RegExp(colorStyle.c06, 'g'), pdfStyle.c06);
    
    //conversion canvas
    var canvas = document.createElement("canvas");
    canvg(canvas,xmlString);
    
    //conversion jpeg
    var imgData = canvas.toDataURL("image/jpeg", 1.0);
    
    //génération pdf
    var doc = new jsPDF();
    doc.text(20, 20, 'Vidjil pdf test');
    doc.text(20, 30, 'hi!');
    doc.addImage(imgData, 'JPEG', 5, 40, 200, 100);
    doc.save('Test.pdf');
  }
  */
  var listF;
  
  function testPDF2(){
    m.focusOut();
    
    var list=m.getSelected()
    var elem = document.getElementById("visu2_svg").cloneNode(true);
    var opt={};
    var doc = new jsPDF();
    
    for (var i = 0; i<list.length; i++){
      var polyline = elem.getElementById("polyline"+list[i])
      polyline.setAttribute("style","stroke-width:6px; stroke:"+tagColor[i]);
      polyline.setAttribute("stroke",tagColor[i]);
    }
    elem.getElementById("resolution1").firstChild.setAttribute("fill","#eeeeee");

    opt.scaleX=180/document.getElementById("visu2_svg").getAttribute("width");
    opt.scaleY=80/document.getElementById("visu2_svg").getAttribute("height");
    opt.x_offset=15;
    opt.y_offset=60;

    doc.setFontSize(12);
    doc.text(145, 20, 'Vidjil - http://bioinfo.lifl.fr/vidjil');
    doc.rect(15, 15, 60, 23);
    doc.text(20, 20, document.getElementById("upload_json").files[0].name);
    doc.text(20, 25, 'run: 2013-10-03');
    doc.text(20, 30, 'analysis: '+m.timestamp.split(' ')[0]);
    doc.text(20, 35, 'germline: '+m.system);
    doc.text(20, 45, 'reads: ' + m.total_size);

    svgElementToPdf(elem, doc, opt)
    doc.setFillColor(255, 255, 255);
    doc.rect(0,140, 210, 140, 'F');
    
    var y=150

    for (var i = 0; i<list.length; i++){
      var id=list[i];
      
      var polyline = document.getElementById("polyline"+id).cloneNode(true);
      polyline.setAttribute("style","stroke-width:40px");
      polyline.setAttribute("stroke",tagColor[i]);
      var res =elem.getElementById("resolution1").cloneNode(true);
      res.firstChild.setAttribute("fill","white");
      var icon=document.createElement("svg");
            
      icon.appendChild(polyline)
      icon.appendChild(res)
      var opt_icon={};
      opt_icon.scaleX=14/document.getElementById("visu2_svg").getAttribute("width");
      opt_icon.scaleY=6/document.getElementById("visu2_svg").getAttribute("height");
      opt_icon.x_offset=15;
      opt_icon.y_offset=y;
      svgElementToPdf(icon, doc, opt_icon)
      
      doc.setFont('courier', 'bold');
      doc.setTextColor(tagColor[i]);
      doc.text(30, y, m.getName(id));
      doc.setFont('courier', 'normal');
      doc.setTextColor(0,0,0);
      var r=0;
      for(var j=0 ;j<m.clones[id].cluster.length; j++){
				r += m.windows[m.clones[id].cluster[j]].ratios[t][0];}
      var s;
      var size=m.getSize(id);
      if (size<0.0001){
	    s=(size).toExponential(1); 
      }else{
	    s=(100*size).toFixed(3)+"%";
      }
      doc.text(130, y, 'reads : '+Math.floor(r*m.total_size[m.t])+' -- '+s);
      
      y=y+5;
      if (typeof(m.windows[id].seg) !='number'){
	//var v_seq=windows[id].seg.sequence.substr(0, windows[id].seg.l1+1);
	//var n_seq=windows[id].seg.sequence.substr(windows[id].seg.l1+1, windows[id].seg.r1);
	//var j_seq=windows[id].seg.sequence.substr(windows[id].seg.r1);

	var seq=m.windows[id].seg.sequence;
	var seq=seq.insert(m.windows[id].seg.r1, "     ");
	var seq=seq.insert(m.windows[id].seg.l1+1, "     ");

	for(j=0 ; j<(Math.floor(seq.length/80)+1) ; j++){
	  doc.text(30, y, seq.substring(j*80, (j+1)*80 ));
	  y=y+5;
	}

	y=y+10;
      }else{
	doc.text(30, y, "segment fail :"+m.windows[id].window);
	y=y+10;
      }
      
    }
    
    doc.output('dataurlnewwindow')
    //doc.save('Test.pdf');
    m.update();

  }
  
String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};
