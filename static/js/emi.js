/**
 * FinWise AI – EMI Calculator JavaScript
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  var formatINR = window.FW.formatINR;
  var postJSON  = window.FW.postJSON;

  // -------------------------------------------------------------------------
  // DOM
  // -------------------------------------------------------------------------
  var emiForm        = document.getElementById('emiForm');
  var resetBtn       = document.getElementById('resetEmi');
  var placeholder    = document.getElementById('emiPlaceholder');
  var resultsEl      = document.getElementById('emiResults');

  if (!emiForm) return; // not on EMI page

  var principalInput = document.getElementById('principal');
  var rateInput      = document.getElementById('annualRate');
  var tenureInput    = document.getElementById('tenure');
  var principalRange = document.getElementById('principalRange');
  var rateRange      = document.getElementById('rateRange');
  var tenureRange    = document.getElementById('tenureRange');
  var tenureMaxLabel = document.getElementById('tenureRangeMax');
  var tenureBtns     = document.querySelectorAll('.tenure-btn');

  var resEmi          = document.getElementById('resEmi');
  var resPrincipal    = document.getElementById('resPrincipal');
  var resTotalInterest = document.getElementById('resTotalInterest');
  var resTotalPayment  = document.getElementById('resTotalPayment');
  var resTenureLabel  = document.getElementById('resTenureLabel');

  var legendPrincipal = document.getElementById('legendPrincipal');
  var legendInterest  = document.getElementById('legendInterest');
  var legendTotal     = document.getElementById('legendTotal');
  var amortBody       = document.getElementById('amortBody');
  var amortBadge      = document.getElementById('amortBadge');

  var emiDonutChart = null;
  var tenureUnit    = 'months';

  // -------------------------------------------------------------------------
  // Tenure toggle (Months / Years)
  // -------------------------------------------------------------------------
  tenureBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tenureBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      tenureUnit = btn.dataset.unit;

      if (tenureUnit === 'years') {
        tenureRange.max   = '30';
        tenureRange.step  = '1';
        tenureRange.value = Math.min(parseInt(tenureRange.value) || 5, 30);
        tenureMaxLabel.textContent = '30 yrs';
        tenureInput.placeholder    = 'e.g. 5';
      } else {
        tenureRange.max   = '360';
        tenureRange.step  = '1';
        tenureRange.value = Math.min(parseInt(tenureRange.value) || 60, 360);
        tenureMaxLabel.textContent = '360 mo';
        tenureInput.placeholder    = 'e.g. 60';
      }
      tenureInput.value = tenureRange.value;
    });
  });

  // -------------------------------------------------------------------------
  // Sync sliders ↔ inputs (two-way)
  // -------------------------------------------------------------------------
  function syncRange(rangeEl, inputEl) {
    rangeEl.addEventListener('input', function () { inputEl.value = rangeEl.value; });
    inputEl.addEventListener('input', function () {
      var v = parseFloat(inputEl.value);
      if (!isNaN(v)) rangeEl.value = v;
    });
  }

  syncRange(principalRange, principalInput);
  syncRange(rateRange,      rateInput);
  syncRange(tenureRange,    tenureInput);

  // Set initial slider defaults
  principalInput.value = principalRange.value = '500000';
  rateInput.value      = rateRange.value      = '8.5';
  tenureInput.value    = tenureRange.value    = '60';

  // -------------------------------------------------------------------------
  // Donut chart
  // -------------------------------------------------------------------------
  function drawDonut(principal, interest) {
    var canvas = document.getElementById('emiDonut');
    if (!canvas || typeof Chart === 'undefined') return;
    if (emiDonutChart) emiDonutChart.destroy();

    emiDonutChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [{
          data: [principal, interest],
          backgroundColor: ['#6929c4', '#da1e28'],
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.label + ': ' + formatINR(ctx.raw);
              },
            },
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Amortisation table (first 12 rows)
  // -------------------------------------------------------------------------
  function buildAmortTable(principal, monthlyRate, emi, tenure) {
    var rows    = Math.min(12, tenure);
    var balance = principal;
    var html    = '';

    for (var m = 1; m <= rows; m++) {
      var intPaid  = balance * monthlyRate;
      var prinPaid = emi - intPaid;
      balance      = Math.max(0, balance - prinPaid);

      html += '<tr>' +
        '<td>' + m + '</td>' +
        '<td>' + formatINR(emi) + '</td>' +
        '<td class="text-success">' + formatINR(prinPaid) + '</td>' +
        '<td class="text-danger">'  + formatINR(intPaid)  + '</td>' +
        '<td>' + formatINR(balance) + '</td>' +
      '</tr>';
    }

    amortBody.innerHTML  = html;
    amortBadge.textContent = rows < tenure
      ? 'First ' + rows + ' months'
      : 'All ' + tenure + ' months';
  }

  // -------------------------------------------------------------------------
  // Form submit
  // -------------------------------------------------------------------------
  emiForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var rawPrincipal = parseFloat(principalInput.value);
    var rawRate      = parseFloat(rateInput.value);
    var rawTenure    = parseFloat(tenureInput.value);

    if (!rawPrincipal || !rawRate || !rawTenure) {
      alert('Please fill in all fields with values greater than zero.');
      return;
    }

    var tenureMonths = tenureUnit === 'years'
      ? Math.round(rawTenure * 12)
      : Math.round(rawTenure);

    postJSON('/api/emi', {
      principal:     rawPrincipal,
      annual_rate:   rawRate,
      tenure_months: tenureMonths,
    })
      .then(function (data) {
        placeholder.classList.add('d-none');
        resultsEl.classList.remove('d-none');

        resEmi.textContent            = formatINR(data.emi);
        resPrincipal.textContent      = formatINR(rawPrincipal);
        resTotalInterest.textContent  = formatINR(data.total_interest);
        resTotalPayment.textContent   = formatINR(data.total_payment);
        resTenureLabel.textContent    = tenureUnit === 'years'
          ? rawTenure + ' years (' + tenureMonths + ' months)'
          : tenureMonths + ' months';

        legendPrincipal.textContent = formatINR(rawPrincipal);
        legendInterest.textContent  = formatINR(data.total_interest);
        legendTotal.textContent     = formatINR(data.total_payment);

        drawDonut(rawPrincipal, data.total_interest);

        var monthlyRate = rawRate / (12 * 100);
        buildAmortTable(rawPrincipal, monthlyRate, data.emi, tenureMonths);

        if (window.innerWidth < 992) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function (err) {
        alert('Calculation failed: ' + err.message);
      });
  });

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  resetBtn.addEventListener('click', function () {
    emiForm.reset();
    principalInput.value = principalRange.value = '500000';
    rateInput.value      = rateRange.value      = '8.5';
    tenureInput.value    = tenureRange.value    = '60';
    placeholder.classList.remove('d-none');
    resultsEl.classList.add('d-none');
    if (emiDonutChart) { emiDonutChart.destroy(); emiDonutChart = null; }
  });

}); // end DOMContentLoaded
