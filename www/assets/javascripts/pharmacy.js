var pharmacy = {};

pharmacy.prep = function(EWD) {
  pharmacy.landingPage(EWD);
}; // ~prep

// Main set-up
pharmacy.landingPage = function(EWD) {

  let params = {
    service: 'ewd-vista-pharmacy',
    name: 'landing.html',
    targetId: 'main-content'
  };

  EWD.getFragment(params, function() {
    $('.fileman-autocomplete').filemanAutocomplete();

    // When a patient is selected!
    $('.fileman-autocomplete').on('filemanautocompleteselect', function(event, ui) {
      let dfn = ui.item.ien;
      let name = ui.item.name;
      let dob = ui.item.dateofbirth;

      pharmacy.footerAddCancel();
      pharmacy.footerAdd(null,null,{dfn: dfn, name: name, dob: dob});

      pharmacy.footerSharedAndGo(EWD);
    });

    // Checkbox - only my institution check event handler.
    $('input:checkbox#chkonlyMyInstitution').change(function() {
      let t = $('#outpatient-pending-table > table');
      if ($('#chkonlyMyInstitution')[0].checked) {
        // Hide institution column
        t.find('tr > *:nth-child(3)').hide();
        //TODO: This is too hackey. See if there's a way to save that info.
        // Hide any data not from the current institution
        let currentDivName = $('#user-division').text().split(': ')[1];
        t.find('td:nth-of-type(3):not(:contains(' + currentDivName + '))').parent().hide();
      }
      else t.find(' * ').show();

      // Calculate total orders
      // Get all visible non header rows and then the last child (count) column
      let totalCount = 0;
      t.find('tbody tr:not(:first):visible td:last-child').each(function() {
        totalCount += +$(this).text();
      });

      // Insert the counts into the badge
      $('ul.nav-tabs > li > a:contains("Outpatient") > span.badge').html(totalCount);
    });

    pharmacy.getInpatientPharmacyOrders(EWD);
    pharmacy.getOutpatientPharmacyOrders(EWD);

    $('#inpatient-refresh-info').off().on('click', function() {
      $('#inpatient-refresh-info svg').addClass('fa-spin');
      pharmacy.getInpatientPharmacyOrders(EWD);
    });

    $('#outpatient-refresh-info').off().on('click', function() {
      $('#outpatient-refresh-info svg').addClass('fa-spin');
      pharmacy.getOutpatientPharmacyOrders(EWD);
    });

    $('#processAll').off().on('click', function () {
      let params = {
        service: 'ewd-vista-pharmacy',
        name: 'modal-table.html',
        targetId: 'modal-window'
      };
      EWD.getFragment(params, function() {
        let params = {
          service: 'ewd-vista-pharmacy',
          type: 'outpatientOrdersAll'
        };
        EWD.send(params, function(res) {pharmacy.drawOutpatientPatientsTable(EWD, res.message);});
      }); //EWD.getFragment
    }); //on.Click

  }); //EWD.getFragement
}; // ~landingPage

pharmacy.getInpatientPharmacyOrders = function(EWD) {
  $('#inpatient-pending-table > table > tbody').html('');
  let params = {
    service: 'ewd-vista-pharmacy',
    type: 'inpatientOrdersSummary'
  };
  EWD.send(params, function(res) {
    pharmacy.drawInpatientPendingOrders(EWD, res.message);
    $('#inpatient-refresh-info svg').removeClass('fa-spin');
  });
};

pharmacy.getOutpatientPharmacyOrders = function(EWD) {
  $('#outpatient-pending-table > table > tbody').html('');
  let params = {
    service: 'ewd-vista-pharmacy',
    type: 'outpatientOrdersSummary'
  };
  EWD.send(params, function(res)  {
    pharmacy.drawOutpatientPendingOrders(EWD, res.message);
    $('#outpatient-refresh-info svg').removeClass('fa-spin');
  });
};

pharmacy.drawInpatientPendingOrders = function(EWD, tableData) {

  // Grab Table Body pointer (table by itself will malfunction)
  let t = $('#inpatient-pending-table > table > tbody');

  // Counters for updating the "badges" next to the tabs
  let countIV = 0, countUD = 0;

  // For each ward group or clinic
  Object.keys(tableData).map(function(type) {
    let typeName = type === 'C' ? 'Clinic' : 'Ward Group';
    t.append(
      '<tr><th colspan="5">' + typeName + '</th></tr>'
    );

    // For each clinic/ward
    Object.keys(tableData[type]).map(function(name) {
      //Add the name in the first cell
      t.append('<tr>');
      t.append('<td>' + name + '</td>');

      // Then each ^ piece after that as IV/UD/IV/UD

      let itemArray = tableData[type][name].toString().split('^');
      for (var itemIndex in itemArray)
      {
        // IVs are in position 0 and 2; UDs in 1 and 3
        // NB: || 0 is to change empty strings to zero.
        countIV += itemIndex % 2 ? 0 : parseInt(itemArray[itemIndex] || 0);
        countUD += itemIndex % 2 ? parseInt(itemArray[itemIndex] || 0) : 0;
        t.append('<td>' + tableData[type][name].toString().split('^')[itemIndex] + '</td>');
      }
      t.append('</tr>');
    });
  });

  // Insert the counts into the badges
  $('ul.dropdown-menu > li > a:contains("UD") > span.badge').html(countUD);
  $('ul.dropdown-menu > li > a:contains("IV") > span.badge').html(countIV);
  $('ul.nav-tabs > li > a:contains("Inpatient") > span.badge').html(countUD + countIV);
};

pharmacy.drawOutpatientPendingOrders = function(EWD, tableData) {
  // Grab Table Body pointer (table by itself will malfunction)
  let t = $('#outpatient-pending-table > table > tbody');

  // Convert Sort Groups into spans for each sort group
  Object.keys(tableData).forEach(function(ien) {
    tableData[ien].clinicSortGroupsSpans = '';
    if (tableData[ien].clinicSortGroups.length > 0) {
      for (let clinicSortGroupIndex in tableData[ien].clinicSortGroups) {
        let clinicSortGroup = tableData[ien].clinicSortGroups[clinicSortGroupIndex];
        tableData[ien].clinicSortGroupsSpans += '<span id=' + clinicSortGroup.ien + '>' + clinicSortGroup.name + '</span>';
      }
    }
  });
  // For each ward group or clinic
  let row = '';
  Object.keys(tableData).forEach(function(ien) {
    row += '<tr id=' + ien + '>' +
           '<td>' + tableData[ien].clinicSortGroupsSpans + '</td>' +
           '<td>' + tableData[ien].name + '</td>' +
           '<td id=' + tableData[ien].institutionIEN + '>' +
           tableData[ien].institutionName + '&nbsp;' +
           '<span class="badge">' + tableData[ien].institutionCount + '</span>' +
           '</td>' +
           '<td>' + tableData[ien].earliestOrderDateTime + '</td>' +
           '<td>' + tableData[ien].latestOrderDateTime + '</td>' +
           '<td>' + tableData[ien].flagged + '</td>';
    row += '<td>';
    Object.keys(tableData[ien].routing).forEach(function(pickup) {
      row += pickup + ': ' + tableData[ien].routing[pickup] + '<br />';
    });
    row += '</td>';
    row += '<td>' + tableData[ien].count + '</td>' +
           '</tr>';
  });

  t.append(row);

  // Click logic for the table -- load modal window
  t.find('tr').click(function() {
    // NB: this is the tr that's clicked
    //     this.id will give us our Hospital Location IEN
    let hospitalLocationIEN = this.id;

    let params = {
      service: 'ewd-vista-pharmacy',
      name: 'modal-table.html',
      targetId: 'modal-window'
    };
    EWD.getFragment(params, function() {
      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'outpatientOrdersByClinic',
        params: { hospitalLocationIEN: hospitalLocationIEN }
      };
      EWD.send(params, function(res) {pharmacy.drawOutpatientPatientsTable(EWD, res.message);});
    });
  });

  let $table = t.closest('table');
  pharmacy.addTableBehaviors(EWD, $table);

  $('#tableReset').click(function(){
    $('input:checkbox#chkonlyMyInstitution').prop( 'checked', false ).change();
  });

  // Make checkbox checked to invoke event and hide institution (default)
  $('input:checkbox#chkonlyMyInstitution').prop( 'checked', true ).change();

  // Add clickable links, first, to institution
  let $th = $table.find('th#institution');
  let columnIndex = $th.index();
  // Underline on hover
  t.find('tr > *:nth-child(' + (columnIndex + 1) + ')').hover(
    function() { $(this).css('text-decoration', 'underline'); },
    function() { $(this).css('text-decoration', 'none');      }
  );
  // Click
  $table.find('tr > *:nth-child(' + (columnIndex + 1) + ')').click(function(e) {
    // Don't let the click event shoot up to the row click
    e.stopPropagation();

    let institutionIEN = this.id;
    let params = {
      service: 'ewd-vista-pharmacy',
      name: 'modal-table.html',
      targetId: 'modal-window'
    };

    EWD.getFragment(params, function() {
      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'outpatientOrdersByInstitution',
        params: { institutionIEN: institutionIEN  }
      };
      EWD.send(params, function(res) {pharmacy.drawOutpatientPatientsTable(EWD, res.message);});
    });
  });

  // Add clickable links, second, to clinic sort group
  $th = $table.find('th#sortGroups');
  columnIndex = $th.index();

  // Underline on hover
  t.find('tr > *:nth-child(' + (columnIndex + 1) + ') span').hover(
    function() { $(this).css('text-decoration', 'underline'); },
    function() { $(this).css('text-decoration', 'none');      }
  );

  // Click
  $table.find('tr > *:nth-child(' + (columnIndex + 1) + ') span').click(function(e) {
    // Don't let the click event shoot up to the row click
    e.stopPropagation();

    let clinicSortGroupIEN = this.id;
    let params = {
      service: 'ewd-vista-pharmacy',
      name: 'modal-table.html',
      targetId: 'modal-window'
    };

    EWD.getFragment(params, function() {
      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'outpatientOrdersByClinicSortGroup',
        params: { clinicSortGroupIEN: clinicSortGroupIEN}
      };
      EWD.send(params, function(res) {pharmacy.drawOutpatientPatientsTable(EWD, res.message);});
    });
  });
};

pharmacy.drawOutpatientPatientsTable = function(EWD, drawData) {
  // Make this a large modal
  $('div.modal-dialog').addClass('modal-lg').removeClass('modal-sm');

  // NB: Data is returned in 5 arrays; the 4 arrays that contain
  // patient data all have the same indexes. data[1] applies to 
  // metaProviders[1], renewals[1], nonFormulary[1] etc.
  let $thead = $('div.modal-body table thead tr');
  let $tbody = $('div.modal-body table tbody');
  let $table = $('div.modal-body table');

  // Add checkbox into $thead (for select all)
  $thead.append('<th><input type="checkbox" /></th>');

  // Draw headers into $thead
  drawData.header.forEach(function(eachHeader) {$thead.append('<th>' + 
        eachHeader + '&nbsp<span class="sortable"><i class="fa fa-caret-up" aria-hidden="true"></i></span></th>');
  }
  );

  // tableRow lets us add html to it before we put it on the page
  let tableRow = '';

  // combinedProviders and Classes add up the cumulative providers and
  // classes for each patient for use in filtering.
  let combinedProviders = {};
  let combinedDrugs = {};
  let combinedClasses = {};

  // NB: This is the main drawing loop!
  drawData.data.forEach(function(datum, index) {
    // Get dropdown data and message into format for dropdowns (inc sorting)
    let sortedMetaProviders = Object.keys(drawData.metaProviders[index]).map(function(key) { return drawData.metaProviders[index][key]; }).sort();
    let sortedMetaDrugs = Object.keys(drawData.metaDrugs[index]).map(function(key) { return drawData.metaDrugs[index][key]; }).sort();
    let sortedMetaVaDrugClasses = Object.keys(drawData.metaVaDrugClasses[index]).sort();
    sortedMetaProviders.forEach(function(one) {combinedProviders[one] = '';});
    sortedMetaDrugs.forEach(function(one) {combinedDrugs[one] = '';});
    sortedMetaVaDrugClasses.forEach(function(one) {combinedClasses[one] = drawData.metaVaDrugClasses[index][one];});

    // Datum 0 is the DFN. We add it then get rid of it.
    // tr has data stuff we use for filtering.
    tableRow += '<tr id="' + datum[0] +'" ';
    tableRow += 'data-providers=\'' + JSON.stringify(sortedMetaProviders) + '\' ';
    tableRow += 'data-classes=\'' + JSON.stringify(sortedMetaVaDrugClasses) + '\' ';
    tableRow += 'data-drugs=\'' + JSON.stringify(sortedMetaDrugs) + '\' ';
    tableRow += 'data-renewals=\'' + drawData.renewals[index] + '\' ';
    tableRow += 'data-nonformulary=\'' + drawData.nonFormulary[index] + '\' ';
    tableRow += 'data-earliestordertime=\'' + Number(drawData.earliestOrdersTimes[index]).dateFromTimson() + '\' ';
    tableRow += 'data-latestordertime=\'' + Number(drawData.latestOrdersTimes[index]).dateFromTimson() + '\' ';
    tableRow += '>';
    datum.shift(); // Get rid of DFN

    // Add checkbox into table first row
    tableRow += '<td><input type="checkbox" /></td>';

    // Add items into table
    datum.forEach(function(item) {tableRow += '<td>' + item + '</td>';});
    tableRow += '</tr>';
  });

  $tbody.append(tableRow);
  
  // Get the arrays from the keys
  let combinedProvidersArray = Object.keys(combinedProviders);
  let combinedDrugsArray     = Object.keys(combinedDrugs);
  let combinedVaClassesArray = Object.keys(combinedClasses);

  // Sort
  combinedProvidersArray.sort();
  combinedDrugsArray.sort();
  combinedVaClassesArray.sort();

  // Put the sorted objects into the drop down boxes on the page
  // Providers
  $('#provider').empty();
  $('#provider').append(new Option('', ''));
  combinedProvidersArray.forEach(function(one) {$('#provider').append(new Option(one, one));});
  // Drugs
  $('#drug').empty();
  $('#drug').append(new Option('', ''));
  combinedDrugsArray.forEach(function(one) {$('#drug').append(new Option(one, one));});
  // and then classes
  $('#class').empty();
  $('#class').append(new Option('', ''));
  combinedVaClassesArray.forEach(function(one) {$('#class').append(new Option(one + ' - ' + combinedClasses[one], one));});

  // Count Updater function (function cuz has to be invoked multiple times)
  var updateCounts = function() {
    let totalCount = 0;
    let patientCount = 0;
    $table.find('tr:not(:first):visible td:last-child').each(function() {
      totalCount += parseInt($(this).text());
      patientCount++;
    });

    $('#patientCount').html(patientCount);
    $('#orderCount').html(totalCount);
  };

  // To show filters
  $('h4 span#fa-caret').off().click(function(){
    $(this).find('svg').toggleClass('fa-caret-right fa-caret-down');
    $('div#filters').slideToggle();
  });

  // Filter the table based on select of these
  var changeFunction = function() {
    $tbody.find(' * ').show();
    let provider = $('#provider').val();
    let drug     = $('#drug').val();
    let vaclass  = $('#class').val();
    $tbody.find('tr').each(function() {
      provArray = $(this).data().providers;
      classArray = $(this).data().classes;
      drugArray = $(this).data().drugs;
      if (vaclass !== '' && !classArray.includes(vaclass)) $(this).hide();
      if (provider !== '' && !provArray.includes(provider)) $(this).hide();
      if (drug    !== ''  && !drugArray.includes(drug)) $(this).hide();
    });
    updateCounts();
  };

  $('#provider').off().change(changeFunction);
  $('#drug').off().change(changeFunction);
  $('#class').off().change(changeFunction);

  // == Checkboxes ==
  // Clear checkboxes and reset dropdowns
  $('a#clearChecks').off().click(function() {
    $tbody.find(' * ').show();
    $('#filters input:checkbox').prop('checked', false);
    $('#provider').prop('selectedIndex', 0);
    $('#drug').prop('selectedIndex', 0);
    $('#class').prop('selectedIndex', 0);
    configureDateRange();
  });
  
  // Window/Inhouse Checkbox
  $('input:checkbox#winOnly').off().change(function() {
    let isChecked = this.checked;
    let columnIndex = $thead.find('th:contains("WINDOW")').index();
    $tbody.find('tr').each(function() {
      let winNum = $(this).find('td:eq(' + columnIndex + ')').text();
      winNum = parseInt(winNum);
      if (isChecked && winNum === 0)  $(this).hide();
      if (!isChecked && winNum === 0) $(this).show();
    });
    updateCounts();
  });

  // Mail Only CheckBox
  $('input:checkbox#mailOnly').off().change(function() {
    let isChecked = this.checked;
    let columnIndex = $thead.find('th:contains("MAIL")').index();
    $tbody.find('tr').each(function() {
      let mailNum = $(this).find('td:eq(' + columnIndex + ')').text();
      mailNum = parseInt(mailNum);
      if (isChecked && mailNum === 0)  $(this).hide();
      if (!isChecked && mailNum === 0) $(this).show();
    });
    updateCounts();
  });

  // Renewals Checkbox
  $('input:checkbox#renewalsOnly').off().change(function() {
    let isChecked = this.checked;
    $tbody.find('tr').each(function() {
      let renewal = $(this).data().renewal;
      if (typeof renewal === 'string') renewal = renewal === 'true' ? true : false;
      if (isChecked && !renewal) $(this).hide();
      if (!isChecked && !renewal) $(this).show();
    });
    updateCounts();
  });

  // Nonformulary Checkbox
  $('input:checkbox#nonformOnly').off().change(function() {
    let isChecked = this.checked;
    $tbody.find('tr').each(function() {
      let nonformulary = $(this).data().nonformulary;
      if (typeof nonformulary === 'string') nonformulary = nonformulary === 'true' ? true : false;
      if (isChecked && !nonformulary) $(this).hide();
      if (!isChecked && !nonformulary) $(this).show();
    });
    updateCounts();
  });

  // CII Checkbox
  $('input:checkbox#cIIOnly').off().change(function() {
    let isChecked = this.checked;
    let columnIndex = $thead.find('th:contains("C II")').index();
    $tbody.find('tr').each(function() {
      let ciiNum = $(this).find('td:eq(' + columnIndex + ')').text();
      ciiNum = parseInt(ciiNum);
      if (isChecked && ciiNum === 0)  $(this).hide();
      if (!isChecked && ciiNum === 0) $(this).show();
    });
    updateCounts();
  });
  
  // CIII-V Checkbox
  $('input:checkbox#cIIIVOnly').off().change(function() {
    let isChecked = this.checked;
    let columnIndex = $thead.find('th:contains("C III-V")').index();
    $tbody.find('tr').each(function() {
      let cother = $(this).find('td:eq(' + columnIndex + ')').text();
      cother = parseInt(cother);
      if (isChecked && cother === 0)  $(this).hide();
      if (!isChecked && cother === 0) $(this).show();
    });
    updateCounts();
  });
  
  // Adds sorting
  pharmacy.addTableBehaviors(EWD, $table);

  // Date time range picker stuff
  $('#modal-window').one('shown.bs.modal',function() {
    // Update counts needs to be called at the end because it operates on
    // visible rows only
    updateCounts();
    // TODO: Figure out how to manage dependency on moment.js
    // & daterangepicker using npm.
    $.getScript('/ewd-vista/assets/javascripts/moment.js')
      .done( function() {
        $.getScript('/ewd-vista/assets/javascripts/daterangepicker.js')
          .done( function() {
            $('<link>').appendTo('head').attr({
              type: 'text/css',
              rel:  'stylesheet',
              href: '/ewd-vista/assets/stylesheets/daterangepicker.css',
            });

            configureDateRange();
          });
      });
  });

  var configureDateRange = function() {
    let startAndStop = dateRange();
    $('input[name="daterange"]').daterangepicker({
      startDate: startAndStop.minDate,
      endDate: startAndStop.maxDate,
      minDate: startAndStop.minDate,
      maxDate: startAndStop.maxDate,
      timePicker: true,
      timePickerIncrement: 1,
      timePickerSeconds: true,
      locale: { format: 'YYYY/MM/DD hh:mm A' },
    },
    function(start, end, label) {
      hideDatesNotInRange(start, end);
    });
  };

  // Date Range finder
  var dateRange = function() {
    // https://stackoverflow.com/questions/11526504/minimum-and-maximum-date
    let maxPossibleDate = new Date(8640000000000000);
    let minPossibleDate = new Date(-8640000000000000);
    
    let earliestDate = maxPossibleDate;
    let lastDate = minPossibleDate;
    $tbody.find('tr').each(function() {
      let startDate = new Date($(this).data().earliestordertime);
      
      if (earliestDate > startDate) earliestDate = startDate;
      if (lastDate < startDate)   lastDate = startDate;
    });

    return {minDate: earliestDate, maxDate: lastDate};
  };

  var hideDatesNotInRange = function(start, end) {
    $tbody.find(' * ').show();
    $tbody.find('tr').each(function() {
      let earlyDate = new Date($(this).data().earliestordertime);
      if (earlyDate < start) $(this).hide();
      if (earlyDate > end  ) $(this).hide();
    });

    updateCounts();
  };
  // <-- End date range stuff

  // Clicking on a patient handler
  // Make sure footer is empty.
  let $footer = $('footer');
  $footer.html('');

  // Handle single patient click
  // Not first child is to prevent clicking the checkbox from processing
  // patient!
  $tbody.find('tr td:not(:first-child)').click(function(e) {
    row = this.parentElement;
    pharmacy.footerAddCancel();
    pharmacy.footerAdd(row, $thead);
    pharmacy.footerSharedAndGo(EWD);
  });

  // Process Displayed click handler
  $('button#procDisplayed').click(function(e) {
    // If no rows, do nothing.
    if (!$tbody.find('tr:visible').length) return;
    // take over the footer and make it into a carousel
    pharmacy.footerAddCancel();
    $tbody.find('tr:visible').each(function(index) {
      pharmacy.footerAdd(this, $thead);
    });
    pharmacy.footerSharedAndGo(EWD);
  });

  // Process Selected click handler
  $('button#procSelected').click(function(e) {
    // If nothing selected, do nothing.
    if (!$tbody.find('tr:visible td input:checked').length) return;
    // take over the footer and make it into a carousel
    pharmacy.footerAddCancel();
    $tbody.find('tr:visible td input:checked').each(function(index) {
      row = $(this).parent().parent()[0];
      pharmacy.footerAdd(row, $thead);
    });

    pharmacy.footerSharedAndGo(EWD);
  });

  // Patient Checkbox stuff!
  // Top checkbox checks/unchecks all other checkboxes
  $thead.find('th input:checkbox').off().change(function(e) {
    let chkState;
    if ($(this).is(':checked')) chkState = true;
    else chkState = false;
    $tbody.find('tr td input:checkbox').prop('checked', chkState);
  });

  // Table checkboxes - Handle Shift (range select)
  $tbody.find('tr td input:checkbox').off().click(function(e) {
    // Don't do anything if being unchecked.
    if (!$(this).is(':checked')) return;

    // If shift key isn't pressed, do not anything extra
    if (!e.shiftKey) return;

    // if shift key pressed, find adjacent ones and highlight if another
    // one is already highlighted.
    let myIndex = $(this).parent().parent().index();

    // List of rows
    let rows = $tbody.find('tr:visible');

    // Search from me going to the top.
    for (let i = myIndex - 1; i > -1; i--) {
      if (rows.eq(i).find('td input:checkbox')[0].checked) {
        // Found one. Check all the intervening boxes.
        $tbody.find('tr:visible').slice(i, myIndex).find('td input:checkbox').prop('checked', true);
        break;
      }
    }
  });
  // <-- End Patient selection stuff
  
  // Modal show stuff
  $('#modal-window').modal({
    backdrop: true,
    keyboard: true,
    focus: true,
    show: true
  });

  $('#modal-window').modal('show');
};

pharmacy.addTableBehaviors = function(EWD, $table) {

  // Add sorting behavior
  $table.find('.sortable').click(function() {
    let dir = $(this).find('svg').hasClass('fa-caret-down') ? 'forwards' : 'backwards';

    if (dir === 'backwards') $(this).find('svg').removeClass('fa-caret-up').addClass('fa-caret-down');
    if (dir === 'forwards')  $(this).find('svg').removeClass('fa-caret-down').addClass('fa-caret-up');

    // Table sorting logic. Takes into account whether to sort lexically or numerically.
    let thisTable = $(this).closest('table');
    let that = this;
    thisTable.find('tbody tr').sort(function(a,b) {
      // Get column index of the clicked triangle
      let columnIndex = $(that).closest('th').index();

      // Grab the values based on the columnIndex
      let tda = $(a).find('td:eq(' + columnIndex +')').text();
      let tdb = $(b).find('td:eq(' + columnIndex +')').text();

      let isNumeric = !isNaN(tda);

      if (dir === 'backwards' && !isNumeric) return tda       < tdb ? 1 : tda       > tdb ? -1 : 0;
      if (dir === 'backwards' && isNumeric)  return tda - tdb < 0   ? 1 : tda - tdb > 0   ? -1 : 0;
      if (dir === 'forwards'  && !isNumeric) return tda       > tdb ? 1 : tda       < tdb ? -1 : 0;
      if (dir === 'forwards'  && isNumeric)  return tda - tdb > 0   ? 1 : tda - tdb < 0   ? -1 : 0;
    }).appendTo(thisTable);
  });

  // Add hiding behavior
  $table.find('.fa-eye-slash').click(function() {
    let columnIndex = $(this).closest('th').index();
    $table.find('tr > *:nth-child(' + (columnIndex + 1) + ')').hide();
  });
  
  // Add hover highlighting logic for table
  $table.find('tbody tr').hover(
    function () {
      $(this).addClass('table-highlight');
    },
    function () {
      $(this).removeClass('table-highlight');
    }
  );
};

pharmacy.footerAddCancel = function() {
  let $footer = $('footer');
  let item = '<div id="0">';
  item += '<i class="fa fa-times-circle fa-3x" aria-hidden="true"></i>';
  item += '</div>';
  $footer.append(item);
};

pharmacy.footerAdd = function(row, $thead, patient) {
  
  let dfn, dob, name;
  if (patient) {
    dfn = patient.dfn;
    dob = patient.dob;
    name = patient.name;
  }
  if ($thead) {
    dfn = row.id;
    let nameIndex = $thead.find('th:contains("Name")').index();
    let DOBIndex  = $thead.find('th:contains("DOB")').index();
    name = $(row).children().eq(nameIndex).text();
    dob  = $(row).children().eq(DOBIndex).text();
  }

  let $footer = $('footer');
  let item = '<div id="' + dfn + '">';
  item += '<strong>';
  item += name;
  item += '</strong><br />';
  item += dob;
  item += '</div>';
  $footer.append(item);
};

pharmacy.footerSharedAndGo = function(EWD) {
  $('footer div').click(function(e) {
    // id = 0 means that we can to cancel (it's the big X)
    // == to coerce into number
    if (this.id == 0) {
      vista.switchApp('pharmacy');
      pharmacy.prep(EWD);
      return;
    }

    // Make only the clicked one white!
    $('footer div').removeAttr('style');
    $(this).css('background-color', 'white');
    $(this).css('color', 'black');
    pharmacy.displayPatientDivByDFN(EWD, this.id);
  });

  // Click the first one! eq(1) cuz 0 is the cancel (big X)
  $('footer div').eq(1).trigger('click');
};

pharmacy.displayPatientDivByDFN = function(EWD,DFN) {
  let params = {
    service: 'ewd-vista-pharmacy',
    name: 'patient.html',
    targetId: 'main-content'
  };

  EWD.getFragment(params, function() {
    $('#modal-window').modal('hide');

    pharmacy.populatePatientPage(EWD,DFN);
  });
};

pharmacy.populatePatientPage = function(EWD,DFN) {

  // Demographics
  pharmacy.displayPatientDemographics(EWD, DFN);

  // ADRs
  pharmacy.populatePatientADRs(EWD, DFN);

  // Outpatient and non-VA meds
  // & Inpatient Meds
  pharmacy.displayMedications(EWD, DFN);

  // Vitals
  pharmacy.displayVitals(EWD, DFN);

  // Labs
  pharmacy.displayLabs(EWD, DFN);

  // Notes
  pharmacy.displayNotes(EWD, DFN);

  // Consults
  pharmacy.displayConsults(EWD, DFN);

  // Immunizations
  pharmacy.displayImmunizations(EWD, DFN);

  /////////////////////////////
  // Write logic now         //
  /////////////////////////////

  pharmacy.wireUpAddAllADRForm(EWD, DFN);

  ////////////////////////////
  // Med Review buttons     //
  ////////////////////////////
  pharmacy.medReconReview(EWD, DFN);
};

pharmacy.displayPatientDemographics = function(EWD, DFN) {
  let messageObj;
  messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getPatientDemographics',
    params: { DFN: DFN },
  };

  EWD.send(messageObj, function(res) {
    let demographics = res.message;
    $('.patient-info h2 #patientName').html(demographics.name);
    $('.patient-info h2 #typeOfCare').html(demographics.episodeType);
    $('.patient-info p  #dob').html(demographics.DOB);
    $('.patient-info p  #age').html(demographics.age);
    $('.patient-info p  #primary-id').html(demographics.ID);
    $('.patient-info p  #sex').html(demographics.sex);
    $('.patient-info p  #ht').html(demographics.height);
    $('.patient-info p  #wt').html(demographics.weight);
    $('.patient-info p  #crcl').html(demographics.crcl);
    $('.patient-info p  #bsa').html(demographics.BSA);
    if (demographics.episodeType == 'Inpatient') {
      $('.patient-info #room-bed-div #room-bed').html(demographics.bed);
    }
    else {
      $('.patient-info #room-bed-div').hide();
    }

    let $phone = $('div#patient-header-demographic-details div#pt-header-pt-phone');
    $phone.find('#home').html(demographics.contact.homePhone ? demographics.contact.homePhone : 'No record found');
    $phone.find('#cell').html(demographics.contact.cellPhone ? demographics.contact.cellPhone : 'No record found');
    $phone.find('#work').html(demographics.contact.workPhone ? demographics.contact.workPhone : 'No record found');
    $phone.find('#email').html(demographics.contact.email ? demographics.contact.email : 'No record found');

    let $address = $('div#patient-header-demographic-details div#pt-header-pt-address');
    let $homeAddress = $address.find('dt#home').next();
    if (demographics.address.street1) {
      $homeAddress.html('<p>' + demographics.address.street1 + '</p>');
      if (demographics.address.street2) $homeAddress.append('<p>' + 
          demographics.address.street2 + '</p>');
      if (demographics.address.street3) $homeAddress.append('<p>' + 
          demographics.address.street3 + '</p>');
      if (demographics.address.city && demographics.address.state) {
        $homeAddress.append('<p>' + demographics.address.city + ', ' +
            demographics.address.state + ' ' + demographics.address.postal +
            '</p>');
      }
      else {
        $homeAddress.append('<p>City and State not found</p>');
      }
      if (demographics.address.country) {
        $homeAddress.append('<p>' + demographics.address.country + '</p>');
      }

      if (demographics.address.badAddressDes) {
        $homeAddress.append('<p><strong>BAD ADDRESS INDICATOR:' + 
            demographics.address.badAddressDes + '</strong></p>');
      }

      let $temporaryAddress = $address.find('dt#temporary').next();
      if (demographics.address.tempStart) {
        $temporaryAddress.append('<p>Above address is temporary</p>');
        let startDate = Number(demographics.address.tempStart).dateFromTimson().toLocaleDateString();
        let endDate;
        if (demographics.address.tempEnd) {
          endDate = Number(demographics.address.tempEnd).dateFromTimson().toLocaleDateString();
        }
        else {
          endDate = 'No end date';
        }

        $temporaryAddress.append('<p>From: ' + startDate + '</p>');
        $temporaryAddress.append('<p>To: ' + endDate + '</p>');
      }
    }
    else {
      $homeAddress.html('<p>No record found</p>');
    }
    // "mailStatusCode":0,"mailStatusText":"REGULAR MAIL","mailStatusExpiration":""
    let $mail = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#mail').next();
    $mail.append('<p>' + demographics.mailInfo.mailStatusText + '</p>')
      .css('text-transform', 'capitalize');
    if (demographics.mailInfo.mailStatusExpiration) {
      $mail.append('<p>Expires: ' + 
        Number(demographics.mailInfo.mailStatusExpiration).dateFromTimson().
          toLocaleDateString() + '</p>');
    }

    let $safetyCap = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#safety').next(); 
    $safetyCap.html(demographics.safetyCapStatus);

    // vista can return yes/no or nothing. If nothing, it means no.
    let $bDialysisPatient = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#dialysis').next();
    $bDialysisPatient.html(demographics.bDialysisPatient ? demographics.bDialysisPatient : 'NO');

    let $outpatientNarrative = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#narrative').next();
    $outpatientNarrative.html(demographics.outpatientNarrative ? 
      demographics.outpatientNarrative : 'No Record Found');

    let $primaryCareAppointmentLabel = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#primaryCareAppointment');
    if (demographics.primaryCareAppointment) {
      $primaryCareAppointmentLabel.next().html(demographics.primaryCareAppointment);
    }
    else {
      $primaryCareAppointmentLabel.hide().next().hide();
    }

    let $pendingClinicAppointmentsLabel = $('div#patient-header-demographic-details div#pt-header-op-pharmacy dt#pendingClinicAppointments');
    if (demographics.pendingClinicAppointments.length) {
      let appointments = [];
      for (let i=0; i < demographics.pendingClinicAppointments.length; i++) {
        let appointment = demographics.pendingClinicAppointments[i];
        let clinic = appointment.clinic;
        let date = Number(appointment.date).dateFromTimson().toLocaleString();
        let days = appointment.days;
        let bCancelled = appointment.bCancelled;
        let string = '<dd class="left-padding-xs">' + date + '  ' + clinic + 
          ( bCancelled ? ' *** Cancelled ***' : ' (' + days + ' days)') + 
          '</dd>';
        appointments.push(string);
      }
      $pendingClinicAppointmentsLabel.after(appointments);
    }
    else {
      $pendingClinicAppointmentsLabel.after('<dd class="left-padding-xs">No appointments found</dd>');
    }

    // Inpatient Information now
    let $ipContainer = $('div#patient-header-demographic-details div#pt-header-ip-pharmacy');

    let $admissionDateLabel = $ipContainer.find('dt#admissionDate');
    let $admissionDateTag   = $admissionDateLabel.next();

    let $dischargeDateLabel = $ipContainer.find('dt#dischargeDate');
    let $dischargeDateTag   = $dischargeDateLabel.next();

    let $transferDateLabel  = $ipContainer.find('dt#transferDate');
    let $transferDateTag    = $transferDateLabel.next();

    let $diagnosisTag       = $ipContainer.find('dt#dx').next();

    let $narrativeTag       = $ipContainer.find('dt#narrative').next();

    let $IMOLabel           = $ipContainer.find('dt#IMO');

    // "inpatientInfo":{
    //   "admissionDate":"3140624.160558",
    //   "admissionDiagnosis":"PNEUMONIA",
    //   "dischargeDate":"3140625.113729",
    //   "transferDate":"",
    //   "narrative":"TESTING INPATIENT NARRATIVE",
    //   "encounters":[]
    // }

    let inpatientInfo = demographics.inpatientInfo;
    // Sometimes the discharge date comes as zero from VistA -- Make
    // sure that that's properly interpreted as a boolean in JS.
    inpatientInfo.dischargeDate = +inpatientInfo.dischargeDate;
    // Admitted and Discharged
    if (inpatientInfo.dischargeDate && inpatientInfo.admissionDate) {
      $admissionDateLabel.html('Last Admission Date');
      $admissionDateTag.html(Number(inpatientInfo.admissionDate).dateFromTimson().toLocaleString());
      $dischargeDateTag.html(Number(inpatientInfo.dischargeDate).dateFromTimson().toLocaleString());
      $transferDateLabel.html('Last Transfer Date');
      $diagnosisTag.html('Not currently admitted');
    }
    // Admitted and not discharged (inpatient)
    if (!inpatientInfo.dischargeDate && inpatientInfo.admissionDate) {
      $admissionDateTag.html(Number(inpatientInfo.admissionDate).dateFromTimson().toLocaleString());
      $dischargeDateTag.html('Currently admitted');
      $diagnosisTag.html(inpatientInfo.admissionDiagnosis);
    }
    // Never admitted before
    if (!inpatientInfo.dischargeDate && !inpatientInfo.admissionDate) {
      $diagnosisTag.html('Not currently admitted');
      $admissionDateTag.html('Never admitted');
      $dischargeDateTag.html('Never admitted');
    }

    inpatientInfo.transferDate ? $transferDateTag.html(Number(inpatientInfo.transferDate).dateFromTimson().toLocaleString()) : $transferDateTag.html('No transfer found');

    inpatientInfo.narrative ? $narrativeTag.html(inpatientInfo.narrative) : $narrativeTag.html('No record found');

    // IMO clinics
    if (demographics.pendingClinicAppointments.length) {
      let appointments = [];
      for (let i=0; i < demographics.pendingClinicAppointments.length; i++) {
        let appointment = demographics.pendingClinicAppointments[i];
        // IMO clinics only.
        if (!appointment.bIMOOkay) continue;
        let clinic = appointment.clinic;
        let date = Number(appointment.date).dateFromTimson().toLocaleString();
        let days = appointment.days;
        let bCancelled = appointment.bCancelled;
        let string = '<dd class="left-padding-xs">' + date + '  ' + clinic + 
          ( bCancelled ? ' *** Cancelled ***' : ' (' + days + ' days)') + 
          '</dd>';
        appointments.push(string);
      }
      $IMOLabel.after(appointments);
    }

    // TODO: NOT TESTED!
    if (inpatientInfo.encounters.length) {
      $IMOLabel.parent().append(inpatientInfo.encounters);
    }

    if (!demographics.pendingClinicAppointments.length && 
        !inpatientInfo.encounters.length) {
      $IMOLabel.hide();
    }

    // VA information
    messageObj = {
      service: 'ewd-vista',
      type: 'agencyIsVA'
    };
    EWD.send(messageObj, function(res) {
      if (res.message) {// Yes, this is a VA system
        // Change outside meds to Non-VA Meds
        $('div#medicationList div#outside h4 span:eq(0)').text('Non-VA');

        // Get VA Data
        messageObj = {
          service: 'ewd-vista-pharmacy',
          type: 'getPatientVAInfo',
          params: { DFN: DFN }
        };
        EWD.send(messageObj, function(res) {
          // Eligibility
          let eligibility = res.message.eligibility;
          if (eligibility.type) $('.patient-info h2 #eligibility-type')
            .html(eligibility.type);
          if (eligibility.scPercentage) $('.patient-info h2 #eligibility-percentage').html('SC%: ' + eligibility.scPercentage + '%');

          let rxStatus = res.message.rxStatus;
          $('.patient-info p  #rx-status').html(rxStatus);

          // Disabilities
          var $disabilities = $('div#patient-header-demographic-details div#pt-header-disabilities');
          if (res.message.ratedDisabilities.data.length) {
            res.message.ratedDisabilities.data.forEach(function(datum){
              datum.shift(); // get rid of ien
              // 0 -> name; 1 -> disability percentage; 2 -> SC true or false
              let str = datum[0] + ' (' + datum[1] + '%) ' + (datum[2] ? 'SC' : 'NSC');
              $disabilities.append('<p>' + str + '</p>');
            });
          }
          else {
            $disabilities.append('<p>No Disabilities found</p>');
          }

        });
      }
      else { // No, this is not a VA system
        $('.patient-info p  .rx-status-caption').hide();
        $('div#patient-header-demographic-details div#pt-header-disabilities').hide();
      }
    }); //end AgencyIsVA
  }); //end  getPatientDemographics
};

pharmacy.displayMedications= function (EWD, DFN) {
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getOutpatientMedications',
    params: { DFN: DFN },
  };

  EWD.send(messageObj, function(res) {
    let $opList = $('#medicationList div#outpatient ul');
    let $nvList = $('#medicationList div#outside ul');

    Object.keys(res.message).forEach(function(key) {
      let legendhtml= '<legend>' + key + '</legend>';
      if (key !== 'ZNONVA') {
        $opList.append(legendhtml);
      }
      res.message[key].forEach(function(item) {
        let itemhtml = '<li>' + item + '</li>';
        if (key === 'ZNONVA') {
          $nvList.append(itemhtml);
        }
        else {
          $opList.append(itemhtml);
        }
      });
    });

    if(!$opList.find('li').length) {
      $opList.append('<legend>No medications found</legend>');
    }
    if(!$nvList.find('li').length) {
      $nvList.append('<legend>No medications found</legend>');
    }
  });

  // Inpatient
  messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getInpatientMedications',
    params: { DFN: DFN },
  };

  EWD.send(messageObj, function(res) {
    let $ipList = $('#medicationList div#inpatient ul'); // Inpatient order
    let $clList = $('#medicationList div#clinic ul');    // or clinic order

    let first = {};
    first['clinic'] = true;
    first['ip'] = true;

    // Order of presentation per routine PSJLMHED
    let orderKeys = ['A', 'B', 'BD', 'CA', 'CC', 'CD', 'CB', 'Cz', 'DF', 'O'];

    orderKeys.forEach(function(key) {

      if (!res.message[key]) return;

      let html = '';
      let whereToAppend = res.message[key].clinicName ? 'clinic' : 'ip';
      let $target = whereToAppend === 'clinic' ? $clList : $ipList;

      if (!first[whereToAppend]) html += '<hr style="border-color: black; border-style: dashed;" />';
      first[whereToAppend] = false;

      let legendText = res.message[key].clinicName ? res.message[key].clinicName + '/' + res.message[key].orderTypeText : res.message[key].orderTypeText;
      let legendhtml= '<legend>' + legendText + '</legend>';
      html += legendhtml;
      
      Object.keys(res.message[key].medicationData).forEach(function(subtype) {
        let legendhtml= '<legend>' + subtype + '</legend>';
        html += legendhtml;
        res.message[key].medicationData[subtype].forEach(function(item) {
          let itemhtml = '<li>' + item + '</li>';
          html += itemhtml;
        });
      });

      $target.append(html);
    });


    if(!$ipList.find('li').length) {
      $ipList.append('<legend>No medications found</legend>');
    }
    if(!$clList.find('li').length) {
      $clList.append('<legend>No medications found</legend>');
    }
  });
};

pharmacy.displayVitals = function(EWD, DFN) {
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getLatestVitals',
    params: { DFN: DFN },
  };
  EWD.send(messageObj, function(res) {
    let $vitals = $('#patientInfoTabContent #vitals');
    let $badge = $('div#patientInfoTablist ul li a[href="#vitals"] span.badge');

    if (!res.message.data.length) {
      $vitals.html('<strong>No vitals found</strong>');
      $badge.html('0');
      return;
    }

    $badge.html(res.message.data.length);

    $vitals.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $vitals.find('table thead');
    $tbody = $vitals.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);
    console.log('foo');

    res.message.data.forEach(function(datum) 
    {
      let row = '<tr id="' + datum[0] + '">';
      datum.shift();
      datum.forEach(function(cell, index) {
        let str;
        if (res.message.dataTypes[index] === 'date') {
          str = new Date(cell).toLocaleString();
        }
        else str = cell;
        row += '<td>' + str + '</td>';
      });
      row += '</tr>';
      $tbody.append(row);
    });
  });
};

pharmacy.displayImmunizations = function(EWD, DFN) {
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getImmunizations',
    params: { DFN: DFN },
  };
  EWD.send(messageObj, function(res) {
    let $imm = $('#patientInfoTabContent #immunizations');
    let $badge = $('div#patientInfoTablist ul li a[href="#immunizations"] span.badge');
    if (!res.message.data.length) {
      $imm.html('<strong>No immunizations found</strong>');
      $badge.html('0');
      return;
    }

    $badge.html(res.message.data.length);

    $imm.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $imm.find('table thead');
    $tbody = $imm.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);

    res.message.data.forEach(function(datum) 
    {
      let row = '<tr id="' + datum[0] + '">';
      datum.shift();
      datum.forEach(function(cell, index) {
        let str;
        if (res.message.dataTypes[index] === 'date') {
          str = new Date(cell).toLocaleString();
        }
        else str = cell;
        row += '<td>' + str + '</td>';
      });
      row += '</tr>';
      $tbody.append(row);
    });
  });
};

pharmacy.displayLabs = function(EWD, DFN) {
  // Labs
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getLatestLabs',
    params: { DFN: DFN }
  };
  EWD.send(messageObj, function(res) {
    let $labs = $('#patientInfoTabContent #labs');
    let $badge = $('div#patientInfoTablist ul li a[href="#labs"] span.badge');

    if (!res.message.data.length) {
      $labs.html('<strong>No labs found</strong>');
      $badge.html('0');
      return;
    }

    $badge.html(res.message.data.length);

    $labs.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $labs.find('table thead');
    $tbody = $labs.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);

    res.message.data.forEach(function(datum) 
    {
      let row = '<tr id="' + datum[0] + '">';
      datum.shift();
      datum.forEach(function(cell, index) {
        let str;
        if (res.message.dataTypes[index] === 'date') {
          str = new Date(cell).toLocaleString();
        }
        else str = cell;
        row += '<td>' + str + '</td>';
      });
      row += '</tr>';
      $tbody.append(row);
    });
  });
};

pharmacy.displayConsults = function(EWD, DFN) {
  // Consults
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getConsults',
    params: { DFN: DFN }
  };
  EWD.send(messageObj, function(res) {
    let $consults = $('#patientInfoTabContent #consults');
    let $badge = $('div#patientInfoTablist ul li a[href="#consults"] span.badge');

    if (!res.message.data.length) {
      $consults.html('<strong>No consults found</strong>');
      $badge.html('0');
      return;
    }

    $badge.html(res.message.data.length);

    $consults.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $consults.find('table thead');
    $tbody = $consults.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);
    console.log('foo');

    res.message.data.forEach(function(datum) 
    {
      let row = '<tr id="' + datum[0] + '">';
      datum.shift();
      datum.forEach(function(cell, index) {
        let str;
        if (res.message.dataTypes[index] === 'date') {
          str = new Date(cell).toLocaleString();
        }
        else str = cell;
        row += '<td>' + str + '</td>';
      });
      row += '</tr>';
      $tbody.append(row);
    });

    // Add hover highlighting logic for table
    $tbody.find('tr').hover(
      function () {
        $(this).addClass('table-highlight');
      },
      function () {
        $(this).removeClass('table-highlight');
      }
    );

    // Click logic for the table -- load modal window for allergy details
    $tbody.find('tr').click(function() {
      // NB: this is the tr that's clicked
      //     this.id will give us the allergy IEN
      let consultIEN = this.id;

      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'getConsultText',
        params: { consultIEN: consultIEN }
      };
      EWD.send(params, function(res) {
        let toAppend = '';
        for (let i = 0 ; i < res.message.length; i++) {
          toAppend += res.message[i] + '<br />';
        }
        $('#modal-window .modal-content .modal-header').html('<h3 class="modal-title">Consult Text</h3>');
        $('#modal-window .modal-content .modal-body').html('<pre></pre>');
        $('#modal-window .modal-content .modal-footer').html('');

        $('#modal-window .modal-content .modal-body pre').html(toAppend);
        $('div.modal-dialog').addClass('modal-lg').removeClass('modal-sm');
        $('#modal-window').modal({
          backdrop: true,
          keyboard: true,
          focus: true,
          show: true
        });

        $('#modal-window').modal('show');
      });
    });
  });
};

pharmacy.displayNotes = function(EWD, DFN) {
  // Notes
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getLatestNotes',
    params: { DFN: DFN }
  };
  EWD.send(messageObj, function(res) {
    let $notes = $('#patientInfoTabContent #notes');
    let $badge = $('div#patientInfoTablist ul li a[href="#notes"] span.badge');
    if (!res.message.data.length) {
      $notes.html('<strong>No notes found</strong>');
      $badge.html('0');
      return;
    }

    $badge.html(res.message.data.length);

    $notes.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $notes.find('table thead');
    $tbody = $notes.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);

    res.message.data.forEach(function(datum) 
    {
      let row = '<tr id="' + datum[0] + '">';
      datum.shift();
      datum.forEach(function(cell, index) {
        let str;
        if (res.message.dataTypes[index] === 'date') {
          str = new Date(cell).toLocaleString();
        }
        else str = cell;
        row += '<td>' + str + '</td>';
      });
      row += '</tr>';
      $tbody.append(row);
    });

    // Add hover highlighting logic for table
    $tbody.find('tr').hover(
      function () {
        $(this).addClass('table-highlight');
      },
      function () {
        $(this).removeClass('table-highlight');
      }
    );

    // Click logic for the table -- load modal window for allergy details
    $tbody.find('tr').click(function() {
      // NB: this is the tr that's clicked
      //     this.id will give us the allergy IEN
      let noteIEN = this.id;

      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'getNoteText',
        params: { noteIEN: noteIEN }
      };
      EWD.send(params, function(res) {
        let toAppend = '';
        for (let i = 0 ; i < res.message.length; i++) {
          toAppend += res.message[i] + '<br />';
        }
        $('#modal-window .modal-content .modal-header').html('<h3 class="modal-title">Note Text</h3>');
        $('#modal-window .modal-content .modal-body').html('<pre></pre>');
        $('#modal-window .modal-content .modal-footer').html('');

        $('#modal-window .modal-content .modal-body pre').html(toAppend);
        $('div.modal-dialog').addClass('modal-lg').removeClass('modal-sm');
        $('#modal-window').modal({
          backdrop: true,
          keyboard: true,
          focus: true,
          show: true
        });

        $('#modal-window').modal('show');
      });
    });
  });
};

pharmacy.populatePatientADRs = function(EWD, DFN) {
  // Allergies/ADRs
  let messageObj = {
    service: 'ewd-vista-pharmacy',
    type: 'getPatientAllergies',
    params: { DFN: DFN }
  };

  EWD.send(messageObj, function(res) {
    let $adr = $('#patientInfoTabContent #adr');
    let $badge = $('div#patientInfoTablist ul li a[href="#adr"] span.badge');
    let $adrBanner = $('div.adr-banner');
    $adr.html('');
    $adrBanner.html('<strong>Allergies/ADRs: </strong>');
    if (!res.message.data) { // We get an extra item here unlike the others
      let str = '<strong>' + res.message.status + '</strong>';
      $adr.html(str);
      $adrBanner.append(str);
      $badge.html('0');
      return;
    }
    
    $badge.html(res.message.data.length);

    $adr.html('<table class="table"><thead></thead><tbody></tbody></table>');
    $thead = $adr.find('table thead');
    $tbody = $adr.find('table tbody');

    let theading = '<tr>';
    for (let h in res.message.headers) theading += '<th>' + res.message.headers[h] + '</th>';
    theading += '</tr>';
    $thead.html(theading);

    res.message.data.forEach( function(datum) {
      let id = datum[0];
      datum.shift();
      let row = '<tr id="' + id + '">';
      datum.forEach( function(cell) { row += '<td>' + cell + '</td>'; });
      $adrBanner.append('<span id="' + id + '">' + datum[0] + '</span>');
      row += '</tr>';
      $tbody.append(row);
    });

    // Add hover highlighting logic for table
    $tbody.find('tr').hover(
      function () {
        $(this).addClass('table-highlight');
      },
      function () {
        $(this).removeClass('table-highlight');
      }
    );

    // Click logic for the table -- load modal window for allergy details
    var fAllergyDetail = function() {
      // NB: this is the tr that's clicked
      //     this.id will give us the allergy IEN
      let adrIEN = this.id;

      let params = {
        service: 'ewd-vista-pharmacy',
        type: 'adrDetailsByIEN',
        params: { adrIEN: adrIEN }
      };
      EWD.send(params, function(res) {
        let toAppend = '';
        for (let i = 0 ; i < res.message.length; i++) {
          toAppend += res.message[i] + '<br />';
        }
        $('#modal-window .modal-content .modal-header').html('<h3 class="modal-title">Allergy Details</h3>');
        $('#modal-window .modal-content .modal-body').html('<pre></pre>');
        $('#modal-window .modal-content .modal-footer').html('');

        $('#modal-window .modal-content .modal-body pre').html(toAppend);
        $('div.modal-dialog').removeClass('modal-lg').removeClass('modal-sm');
        $('#modal-window').modal({
          backdrop: true,
          keyboard: true,
          focus: true,
          show: true
        });

        $('#modal-window').modal('show');
      });
    };

    $tbody.find('tr').click(fAllergyDetail);
    $adrBanner.find('span').click(fAllergyDetail);
  });
};

/* Logic that handles adding an allergy */
pharmacy.wireUpAddAllADRForm = function (EWD, DFN) {
  // Add an event for allergy updates
  EWD.off('vista.adr.update');
  EWD.on('vista.adr.update', function(eventData) {
    pharmacy.populatePatientADRs(eventData.EWD, eventData.DFN);
  });

  //Allergies/ADR first
  $('div#patientInfoTablist #addADR').off().click(function() {
    let params = {
      service: 'ewd-vista-pharmacy',
      name: 'adr.html',
      targetId: 'modal-window'
    };
    EWD.getFragment(params, function() {

      // Allergies/ADRs
      let messageObj = {
        service: 'ewd-vista-pharmacy',
        type: 'getPatientAllergies',
        params: { DFN: DFN }
      };
      EWD.send(messageObj, function(res) {
        // This block deals with showing allergies.
        let $chkNKA = $('div.modal-dialog div.modal-body input#nka');
        if (res.message.data) { // Patient already has allergies
          let $mydiv = $chkNKA.parent(); // get parent div
          $mydiv.html('<div class="adr-banner"></div>');
          $banner = $mydiv.find('div.adr-banner');
          $banner.html('<span>Current Allergies/ADRs:</span>'); // put this instead
          res.message.data.forEach( function(datum) {
            let id = datum[0];
            datum.shift();
            $banner.append('<span id="' + id + '">' + datum[0] + '</span>');
          });
        }

        // If NKA, disable mark NKA checkbox
        if (res.message.statusCode === 'NKA') {
          $chkNKA.prop('checked', 'checked');
          $chkNKA.prop('disabled', true);
        }

        // else (default case), $chkNKA is enabled and can be clicked by the
        // user
        $chkNKA.change(function() {
          if ($chkNKA[0].checked) {
            let messageObj = {
              service: 'ewd-vista-pharmacy',
              type: 'markPatientAllergies',
              params: { 
                DFN: DFN,
                isNKA: true
              }
            };
            EWD.send(messageObj, function(res) {
              if (!res.error) {
                $('#modal-window').modal('hide');
                EWD.emit('vista.adr.update', { EWD: EWD, DFN: DFN });
              }
            });
          }
        });

        // Reference various inputs
        let $reactant = $('div.modal-body form input#reactant');
        let $availableSS = $('div.modal-body form select#availableSS');
        let $selectedSS = $('div.modal-body form select#selectedSS');
        let $obsInfoDiv =  $('div.modal-body form div#obsInfo');
        let $chkObserved = $('div.modal-body form input#chkObserved');
        let $txtSSSearch = $('div.modal-body form input#txtSSSearch');
        let $okayButton  = $('div.modal-footer button#ok-button');

        // All of the following is jquery-ui stuff for the reactant field.
        // http://jqueryui.com/autocomplete/
        let categories = [];
        $reactant.autocomplete({
          open: function() {
            // NB: This is necessary b/c the modal z-index is 1050
            // Rest is for paging long selecions.
            $(this).autocomplete('widget').css('z-index', 1100);
            $(this).autocomplete('widget').css('max-height', '300px');
            $(this).autocomplete('widget').css('overflow-y', 'auto');
            $(this).autocomplete('widget').css('overflow-x', 'hidden');
          },
          source: function (req, resp) {
            if (req.term.length >= 3) {
              let messageObj = {
                service: 'ewd-vista-pharmacy',
                type: 'searchforAllergens',
                params: { from: req.term }
              };
              EWD.send(messageObj, function(res) {
                let vistaCategories = res.message.categories;
                categories = pharmacy.reorgVistAAllergenCategories(vistaCategories);
                resp(res.message.allergens);
              });
            }
          },
          select: function(e, ui) {
            console.log(ui);
            $reactant.val(ui.item.name);
            $reactant.data('ien', ui.item.ien);
            $reactant.data('name', ui.item.name);
            $reactant.data('global', ui.item.global);
            $reactant.data('type', ui.item.type);
            $okayButton.prop('disabled', false);
            return false;
          }
        });

        // Custom rendering to show 
        $reactant.autocomplete('instance')._renderItem=function(ul,item){
          item.value = item.ien;
          let itemCategory = categories[item.category];
          item.label = '<span class="label label-default">' + itemCategory + '</span>' +
            '<span class="label label-info">' + item.name + '</span>';
          return $('<li>')
            .append(item.label)
            .appendTo(ul);
        };

        // Observed click shows two extra fields
        $chkObserved.change(function() {
          this.checked ? $obsInfoDiv.show() : $obsInfoDiv.hide();
        });

        // Fill top 10 sign and symptoms and then alpha sign and symptoms
        let messageObj = {
          service: 'ewd-vista-pharmacy',
          type: 'getAllergyDialogData'
        };
        EWD.send(messageObj, function(res) {
          let topTenSS = res.message.topTenSS;
          let allSS    = res.message.allSS;
          topTenSS.forEach(function(item) {
            $availableSS[0].options.add(new Option(item.name, item.ien));
          });
          $availableSS[0].options.add(new Option('-----------', 0));
          allSS.forEach(function(item) {
            $availableSS[0].options.add(new Option(item.name, item.ien));
          });
        });

        // Below logic is for sign and symptoms select box scrolling and
        // autoloading
        let loadMoreSymptomsTimedFunction = null;
        $availableSS.scroll(function() {
          let selectTag = $(this);
          let lastOption = selectTag.find('option:last');
          let s = selectTag.position().top + selectTag.height();
          let o = lastOption.height() + lastOption.position().top - 20;

          // next 2 lines to prevent us from responding to multiple events
          // https://stackoverflow.com/questions/12119107/prevent-javascript-function-from-firing-multiple-times
          // Fire repeated event every 200ms.
          clearTimeout(loadMoreSymptomsTimedFunction);
          loadMoreSymptomsTimedFunction = setTimeout(function() {
            if (o < s) {
              let messageObj = {
                service: 'ewd-vista-pharmacy',
                type: 'getAllergySignsSymptomsContinued',
                params: { from: lastOption[0].text }
              };
              EWD.send(messageObj, function(res) {
                let allSS = res.message;
                allSS.forEach(function(item) {
                  $availableSS[0].options.add(new Option(item.name, item.ien));
                });
              });
            }
          }, 200);
        });

        // Logic here is to select an entry when clicked and move it over to
        // the other listbox
        // TODO: Not 508 compliant
        $availableSS.change(function() {
          let selection = this.item(this.selectedIndex);
          if (selection.value == 0) return; // don't process the ---- line
          // Next two lines to prevent adding item twice
          let found = false;
          $selectedSS.find('option').each(function() {
            if (this.value === selection.value) {
              found = true;
              return false;
            }
          });
          if (!found) $selectedSS[0].add(new Option(selection.text, selection.value));
        });

        // ditto here to remove an entry when clicked.
        // TODO: Not 508 compliant
        $selectedSS.change(function() {
          this.remove(this.selectedIndex);
        });

        // Search for signs and symptoms input handling
        $txtSSSearch.on('input', function() {
          if (this.value === '') return;
          let messageObj = {
            service: 'ewd-vista-pharmacy',
            type: 'getAllergySignsSymptomsContinued',
            params: { from: this.value.toUpperCase() }
          };
          EWD.send(messageObj, function(res) {
            $availableSS.empty();
            let allSS = res.message;
            allSS.forEach(function(item) {
              $availableSS[0].options.add(new Option(item.name, item.ien));
            });
          });
        });

        // Add a date picker to observation date
        let $obsDate = $('div.modal-body form input#obsDate');
        $obsDate.datepicker();

        // Cancel button wireup
        let $cancelButton = $('div.modal-footer button#cancel-button');
        $cancelButton.click(function() {
          $('#modal-window').modal('hide');
        });
        // Okay button submits
        $okayButton.click(function() {
          $('div.modal-body form').submit();
        });

        // Form submission logic
        $('div.modal-body form').submit(function(e){
          e.preventDefault(); // Don't do a GET http request on submit
          let p = {}; // for parameeters
          p.DFN = DFN;
          p.adrIEN = 0;

          p.allergen = {};
          p.allergen.name         = $reactant.data().name;
          p.allergen.ien          = $reactant.data().ien;
          p.allergen.global       = $reactant.data().global;
          p.allergen.typeInternal = $reactant.data().type;

          // radio button
          p.reactionTypeInternal =  $('div.modal-body form input[name=reactionType]:checked').val();

          p.ss = [];

          $selectedSS.find('option').each(function() {
            let one = {};
            one.ien = this.value;
            one.name = this.text;
            p.ss.push(one);
          });

          p.comments = $('div.modal-body form textarea#comments').val();

          p.observationType = 'historical';

          if ($chkObserved[0].checked) {
            p.observationType = 'observed';
            p.fmObsDate = $obsDate.datepicker('getDate').toTimsonDate();
            p.obsADRSeverity = $('div form input[name=reactionSeverity]:checked').val();
          }

          let messageObj = {
            service: 'ewd-vista-pharmacy',
            type: 'addOrEditADRRecord',
            params: p 
          };

          EWD.send(messageObj, function(res) {
            EWD.emit('vista.adr.update', { EWD: EWD, DFN: DFN });
            $('#modal-window').modal('hide');
          });

        });

        // Finally, show modal
        $('div.modal-dialog').removeClass('modal-lg')
          .removeClass('modal-sm');
        $('#modal-window').modal({
          backdrop: true,
          keyboard: true,
          focus: true,
          show: true
        });
        $('#modal-window').modal('show');
      });
    });
  });
};

// Change the VistA allergen categories into something more user friendly.
pharmacy.reorgVistAAllergenCategories = function(vistaCategories) {
  let newCategories = {};
  Object.keys(vistaCategories).forEach(function(key) {
    let catDescription = vistaCategories[key];
    if (catDescription.indexOf('VA Allergies File') > -1) newCategories[key] = 'Allergen';
    if (catDescription.indexOf('Generic Drug Name') > -1) newCategories[key] = 'Generic';
    if (catDescription.indexOf('Trade Name') > -1)        newCategories[key] = 'Brand';
    if (catDescription.indexOf('Local Drug') > -1)        newCategories[key] = 'Local Drug';
    if (catDescription.indexOf('Drug Ingredients') > -1)  newCategories[key] = 'Ingredient';
    if (catDescription.indexOf('Drug Class') > -1)        newCategories[key] = 'Class';

  });
  return newCategories;
};

pharmacy.medReconReview = function(EWD, DFN) {
  // Pick selected elements only up to 2; and then process these for recon
  $('#medicationList div h4 span#reconcile').click(function() {
    $(this).toggleClass('selected');
    let $allCurrentlySelected = $('#medicationList div h4 span.selected');
    if ($allCurrentlySelected.length > 1) {
      pharmacy.twinlist = {};
      pharmacy.twinlist.headers = [];

      $allCurrentlySelected.each(function() {
        pharmacy.twinlist.headers.push(this.parentElement.innerText);
      });

      $('#modal-window').modal({
        backdrop: true,
        keyboard: true,
        focus: true,
        show: true
      });

      $('#modal-window').one('hidden.bs.modal', function() {
        $('#medicationList div h4 span#reconcile').removeClass('selected');
        $(this).off();
      });

      let params = {
        service: 'ewd-vista-pharmacy',
        name: 'med-recon.html',
        targetId: 'modal-window'
      };
      EWD.getFragment(params, function() {
        $('#modal-window').modal('show');
      });
    }
  });
};

/*
  Copyright 2017 Sam Habiel, Pharm.D.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
