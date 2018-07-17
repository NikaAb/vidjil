load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSampleSet < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("http://localhost/browser")
    end
    login_form = $b.form(:id => 'login_form')
    if login_form.present?
      login_form.text_field(:id => "auth_user_email").set('plop@plop.com')
      login_form.text_field(:id => "auth_user_password").set('foobartest')
      login_form.tr(:id => 'submit_record__row').input(:type => 'submit').click
    end
  end

  def go_to_first
    # load patient list
    $b.a(:class => "button button_token patient_token", :text => "patients").click
    table = $b.table(:id => "table")
    table.wait_until_present
    lines = table.tbody.rows
    lines[0].wait_until_present
    # select first patient
    lines[0].click
    # check that list of samples is loaded
    table = $b.table(:id => "table")
    table.wait_until_present
    table
  end

  def test_001_add
    table = go_to_first

    add_button = $b.span(:text => "+ add samples")
    add_button.wait_until_present
    add_button.click
    form = $b.form(:id => "upload_form")
    form.wait_until_present

    $b.input(:id => "source_nfs").click

    num_additional_files = 2
    file_button = $b.span(:id => "file_button")
    for i in 0..num_additional_files-1
      file_button.click
    end

    jstree = $b.div(:id => "jstree")
    for i in 0..num_additional_files
      $b.div(:id => "jstree_field_%d" % i).span(:text => "browse").click
      assert(jstree.visible?)
      jstree.a(:id => "/_anchor").double_click
      jstree_file = jstree.a(:id => "//Demo-X5.fasta_anchor")
      jstree_file.wait_until_present
      jstree_file.click

      $b.span(:id => "jstree_button").click
      assert(!jstree.visible?)

      form.text_field(:id => "file_sampling_date_%d" % i).set("2010-10-10")
      form.text_field(:id => "file_info_%d" % i).set("#my_file_%d" % i)
      # TODO test other sets
    end
    form.input(:type => "submit").click

    table = $b.table(:id => "table")
    table.wait_until_present

    lines = table.tbody.rows
    assert(lines.count == num_additional_files + 1)
  end

  def test_zz_close
    close_everything
  end
end
