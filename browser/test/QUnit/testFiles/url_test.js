
QUnit.module("Url", {
});

/* ------------------------------------ */
var current_url = "mock://"
var windowMock = {
    mocked: true,
    location: {
        search: {
            toString: function() { var search = (current_url + '?').split('?')[1] ;
                                   return (search == "" ? "" : '?' + search) }
        }},
    history: {
        pushState: function(x, y, url) { current_url = url }
    }
};
windowMock.window = windowMock
/* ------------------------------------ */

QUnit.test("clone : modifyURL", function(assert) { with (windowMock) {

    var m = new Model();
    m.parseJsonData(json_data,100)
    var sp = new ScatterPlot("visu",m);
    sp.init();
    var url= new Url(m, window);
    url.init();
    sp.init();
    // assert.equal(sp.select_preset.selectedIndex,1, "test selected index");
    // assert.equal(sp.default_preset, 1, "test default_preset")
    m.select(1)
    m.update()
    assert.equal(window.location.search.toString(),"?clone=1", "url is updated with the clone name");

    assert.deepEqual(url.url_dict,{
        "clone": "1"
    }, "test url_dict")
    m.multiSelect([1,2,3])
    m.update()
    assert.equal(window.location.search.toString(),"?clone=1,2,3", "url is updated with the multiple clone name");

    assert.deepEqual(url.url_dict,{
        "clone": "1,2,3"
    }, "test url_dict");
    m.unselectAll();
    assert.equal(window.location.search.toString(),"", "reboot url");
    sp.init()
    sp.changeSplitMethod("n", "Size", "bar");
    sp.update()
    assert.equal(window.location.search.toString(),"", "test if plot is in url");

}});

QUnit.test("plot : modifyURL",function (assert) { with (windowMock) {

    var m = new Model();
    m.parseJsonData(json_data,100)
    var sp = new ScatterPlot("visu",m);
    sp.init();
    var url= new Url(m, window);
    url.init();
    // sp.changeSplitMethod("n", "Size", "bar");
    sp.changeXaxis()
    sp.changeYaxis()
    m.update()
     assert.deepEqual(url.url_dict,{
        "plot": "gene_v,gene_j,grid"
        }, "test plot url_dict")
    assert.equal(window.location.search.toString(),"?plot=gene_v,gene_j,grid", "test if plot is in url");

}});


