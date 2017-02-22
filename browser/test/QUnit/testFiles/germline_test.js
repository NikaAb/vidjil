
QUnit.module("Germline", {
});

QUnit.test("germline_data : ", function(assert) {

    // Those tests should fail whenever we change the structure of germline.js
    assert.ok(typeof(germline_data) != "undefined", "germline_data should be loaded")
    assert.ok(typeof(germline_data['systems']) != "undefined", "germline_data should have a systems entry")
    assert.ok(typeof(germline_data['systems']['IGH']) != "undefined", "germline_data should have an IGH entry")
    assert.equal(typeof(germline_data['systems']['AZE']), "undefined", "germline_data should not have an AZE entry")
    assert.equal(germline_data['species'], "Homo sapiens", "species in germline_data is Homo sapiens")
})

QUnit.test("GermlineList : ", function(assert) {
    gl = new GermlineList();
    gl.load()

    assert.ok(gl.getColor('IGH') != "", "IGH should have a color")
    assert.ok(gl.getColor('IGH+') != "", "IGH+ should have a color")
    assert.ok(gl.getColor('TRG') != "", "TRG should have a color")
    assert.ok(gl.getColor('IGL') != "", "IGL should have a color")
    assert.equal(gl.getColor('AZE'), "", "AZE should not have a color")

    assert.ok(gl.getShortcut('IGH') != "", "IGH should have a shortcut")
    assert.ok(gl.getShortcut('IGH+') != "", "IGH+ should have a shortcut")
    assert.ok(gl.getShortcut('TRG') != "", "TRG should have a shortcut")
    assert.ok(gl.getShortcut('IGL') != "", "IGL should have a shortcut")
    assert.equal(gl.getShortcut('AZE'), "x", "AZE should not have a shortcut")

    gl.add({'AZE': { 'shortcut': '$', 'color': '#ffffff'}})
    assert.equal(gl.getColor('AZE'), "#ffffff", "AZE should have a color")
    assert.equal(gl.getShortcut('AZE'), "$", "AZE should have a shortcut")
})
