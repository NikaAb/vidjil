load 'segmenter_browser.rb'
load 'segmenter_test.rb'

class TestSegmenterPage < SegmenterTest

  def test_00_launch_query
    sequences = $b.textarea(:id => 'form_sequences')

    sequences.set ">seq1
CGTCTTCTGTACTATGACGTCTCCAACTCAAAGGATGTGTTGGAATCAGGACTCAGTCCAGGAAAGTATTATACTCATACACCCAGGAGGTGGAGCTGGATATTGATACTACGAAATCTAATTGAAAATGATTCTGGGGTCTATTACTGTGCCACCTGGGGGGCCAGATTATAAGAAACTCTTTGGCAGTGGAACAACAC

>seq2
GGGGGAGGCTTGGTACAGCCTGGGGGGTCCCTGAGACTCTCCTGTGCAGCCTCTGGATTCACCTTCAGTAGCTACGACATGCACTGGGTCCGCCAAGCTACAGGAAAAGGTCTGGAGTGGGTCTCAGCTATTGGTACTGCTGGTGACACATACTATCCAGGCTCCGTGAAGGGCCGATTCACCATCTCCAGAGAAAATGCCAAGAACTCCTTGTATCTTCAAATGAACAGCCTGAGAGCCGGGGACACGGCTGTGTATTACTGTGCAAGAGTGAGGCGGAGAGATCGGGGGATTGTAGTGGTGGTAGCTGCTACTCAACGGTAAGTTGGTTCGACCCCTGGGGCCAGGGAACCCTGGTCACCGTCTCCTCAGGT"

    assert (not $b.element(:class => 'segmenter').present?), "Segmenter should not be present yet"
    assert (not $b.element(:class => 'scatterplot').present?), "Segmenter should not be present yet"

    $b.button(:id => 'form_submit').click

    $b.element(:class => 'imgAjaxLoading').wait_until_present
    $b.clone_in_scatterplot('0').wait_until_present
    
    assert ($b.element(:class => 'segmenter').present?), "Segmenter should be present"
    assert ($b.element(:class => 'scatterplot').present?), "Segmenter should be present"
  end

  def test_01_segmenter
    assert ($b.clone_in_segmenter('0').visible?), "Clone 0 should be in segmenter"
    assert ($b.clone_in_segmenter('1').visible?), "Clone 1 should be in segmenter"
    assert (not $b.clone_in_segmenter('2').exists?), "Clone 2 should not exist"
  end

  def test_02_scatterplot
    assert ($b.clone_in_scatterplot('0').visible?), "Clone 0 should be in scatterplot"
    assert ($b.clone_in_scatterplot('1').visible?), "Clone 1 should be in scatterplot"
    assert (not $b.clone_in_scatterplot('2').visible?), "Clone 2 should not be visible"
  end

  def test_03_change_color
    $b.clone_in_segmenter('0').hover
    $b.clone_info_segmenter('0')[:star].click
    tagColor = $b.tag_item('3')[:color].style('background-color')
    check_segmenter_on_the_right
    $b.tag_item('3')[:name].click
    $b.clone_in_segmenter('1').hover # Change clone to hover: on hover color doesn't change

    assert ($b.clone_info_segmenter('0')[:name].style('color') == tagColor), "Clone has not changed color in segmenter"

    # Must remove rgb from the start of the fill style, and the closing parentheses at the end,
    # as tagColor is a rgba color with four components, and not just a rgb as the fill color.
    assert (tagColor.index($b.clone_in_scatterplot('0').style('fill')[4..-2]) > 0), "Clone has not changed color in scatterplot"

    # Check that scatterplot is still on the right
    check_segmenter_on_the_right
  end

  def test_04_segmenter_highlights
    for i in ['0', '1']
      for gene in ['V', 'J']
        span = $b.clone_in_segmenter(i).span(:class => gene)
        assert (span.visible?), "#{gene} span should be visible"
      end
    end
  end

  def test_06_scatterplot_change_preset
    $b.scatterplot_select_preset(/CDR3 length/)
                                       
    assert ($b.scatterplot_x_label.text =~ /CDR3 length/), "X scatterplot label should now be CDR3 length (was %s)" % $b.scatterplot_x_label.text
    sleep 1 # Waiting for the transition to finish
    assert ($b.clone_in_scatterplot('1').tag_name == 'rect'), "Clone should be a rectangle now (was %s)" % $b.clone_in_scatterplot('1').tag_name
  end

  def test_07_export_fasta
    $b.element(:id => 'btn_exportfasta').click
    
    assert ( $b.window(:title => "").exists? ) , ">> fail opening fasta export "
    $b.window(:title => "").use do
      assert ($b.text.index(/TRGV5.*200 nt/) > 0), "header name"
      assert ($b.text.index(/IGHV3-13.*374 nt/) > 0), "header name"
      assert ($b.text.include? "CCTGGG\nGGGCCAG\nATT"), "sequence"
    end
  end
  
  def check_segmenter_on_the_right
    
    right_coord_of_textarea = $b.sequences_area.wd.location.x \
                              + $b.sequences_area.wd.size.width
    left_coord_of_scatterplot = $b.scatterplot.wd.location.x

    assert (right_coord_of_textarea < left_coord_of_scatterplot), "Textarea should be left of scatterplot"
  end

  def test_zz_close
    close_everything
  end
end
