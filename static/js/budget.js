/**
 * FinWise AI – Budget Planner JavaScript
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  var formatINR = window.FW.formatINR;
  var postJSON  = window.FW.postJSON;

  // -------------------------------------------------------------------------
  // DOM
  // -------------------------------------------------------------------------
  var budgetForm        = document.getElementById('budgetForm');
  var resetBtn          = document.getElementById('resetBudget');
  var placeholder       = document.getElementById('budgetPlaceholder');
  var resultsEl         = document.getElementById('budgetResults');

  if (!budgetForm) return; // not on budget page

  var resIncome         = document.getElementById('resIncome');
  var resExpenses       = document.getElementById('resExpenses');
  var resSavings        = document.getElementById('resSavings');
  var resSavingsPct     = document.getElementById('resSavingsPct');
  var budgetSuggestions = document.getElementById('budgetSuggestions');
  var savingsBar        = document.getElementById('savingsBar');
  var savingsBarLabel   = document.getElementById('savingsBarLabel');
  var savingsBarStatus  = document.getElementById('savingsBarStatus');
  var budgetLegend      = document.getElementById('budgetLegend');

  var donutChart = null;

  // Expense category metadata
  var CATEGORIES = [
    { id: 'rent',          label: 'Rent',          color: '#0f62fe' },
    { id: 'food',          label: 'Food',          color: '#e67e00' },
    { id: 'transport',     label: 'Transport',     color: '#00a6fb' },
    { id: 'utilities',     label: 'Utilities',     color: '#da1e28' },
    { id: 'entertainment', label: 'Entertainment', color: '#6929c4' },
  ];

  // -------------------------------------------------------------------------
  // Donut Chart (Chart.js must be loaded before this script)
  // -------------------------------------------------------------------------
  function drawDonut(data, labels, colors) {
    var canvas = document.getElementById('budgetDonut');
    if (!canvas || typeof Chart === 'undefined') return;
    if (donutChart) donutChart.destroy();

    donutChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
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
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                return ' ' + ctx.label + ': ' + formatINR(ctx.raw) + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Build legend HTML
  // -------------------------------------------------------------------------
  function buildLegend(cats, values) {
    var total = values.reduce(function (a, b) { return a + b; }, 0);
    budgetLegend.innerHTML = cats.map(function (cat, i) {
      var pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
      return '<div class="budget-legend-item">' +
        '<span class="bli-dot" style="background:' + cat.color + '"></span>' +
        '<div class="flex-grow-1">' +
          '<div class="d-flex justify-content-between">' +
            '<span class="bli-label">' + cat.label + '</span>' +
            '<span class="bli-pct">' + pct + '%</span>' +
          '</div>' +
          '<div class="bli-value">' + formatINR(values[i]) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // -------------------------------------------------------------------------
  // Render AI suggestions
  // -------------------------------------------------------------------------
  function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      budgetSuggestions.innerHTML = '<p class="text-muted small">No suggestions at this time.</p>';
      return;
    }
    budgetSuggestions.innerHTML = suggestions.map(function (s) {
      var cls = '';
      if (s.indexOf('exceed') !== -1 || s.indexOf('critically') !== -1) cls = 'si-danger';
      else if (s.indexOf('Excellent') !== -1 || s.indexOf('great') !== -1) cls = 'si-success';
      return '<div class="suggestion-item ' + cls + '">' +
        '<i class="bi bi-lightbulb-fill text-warning flex-shrink-0 mt-1"></i>' +
        '<span>' + s + '</span>' +
      '</div>';
    }).join('');
  }

  // -------------------------------------------------------------------------
  // Update savings progress bar
  // -------------------------------------------------------------------------
  function updateSavingsBar(pct) {
    var clamped = Math.max(0, Math.min(100, pct));
    savingsBar.style.width = clamped + '%';
    savingsBar.setAttribute('aria-valuenow', clamped);
    savingsBarLabel.textContent = pct.toFixed(1) + '%';

    if (pct < 0) {
      savingsBar.className = 'progress-bar bg-danger';
      savingsBarStatus.textContent = 'Deficit';
    } else if (pct < 10) {
      savingsBar.className = 'progress-bar bg-warning';
      savingsBarStatus.textContent = 'Below target';
    } else if (pct < 20) {
      savingsBar.className = 'progress-bar bg-info';
      savingsBarStatus.textContent = 'Almost there';
    } else {
      savingsBar.className = 'progress-bar bg-success';
      savingsBarStatus.textContent = 'On track';
    }
  }

  // -------------------------------------------------------------------------
  // Form submit
  // -------------------------------------------------------------------------
  budgetForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var income     = parseFloat(document.getElementById('income').value) || 0;
    var expValues  = CATEGORIES.map(function (c) {
      return parseFloat(document.getElementById(c.id).value) || 0;
    });

    var body = { income: income };
    CATEGORIES.forEach(function (c, i) { body[c.id] = expValues[i]; });

    postJSON('/api/budget', body)
      .then(function (data) {
        placeholder.classList.add('d-none');
        resultsEl.classList.remove('d-none');

        resIncome.textContent     = formatINR(income);
        resExpenses.textContent   = formatINR(data.total_expenses);
        resSavings.textContent    = formatINR(data.savings);
        resSavingsPct.textContent = data.savings_pct + '%';

        // Colour savings card red if negative
        var savCard = resSavings.closest('.result-mini-card');
        if (savCard) savCard.style.background = data.savings < 0 ? '#fff1f1' : '';

        // Chart: only non-zero categories
        var nonZeroIdx    = expValues.map(function (v, i) { return i; }).filter(function (i) { return expValues[i] > 0; });
        var chartData     = nonZeroIdx.map(function (i) { return expValues[i]; });
        var chartLabels   = nonZeroIdx.map(function (i) { return CATEGORIES[i].label; });
        var chartColors   = nonZeroIdx.map(function (i) { return CATEGORIES[i].color; });

        if (chartData.length > 0) {
          drawDonut(chartData, chartLabels, chartColors);
          buildLegend(nonZeroIdx.map(function (i) { return CATEGORIES[i]; }), chartData);
        }

        updateSavingsBar(data.savings_pct);
        renderSuggestions(data.suggestions);

        if (window.innerWidth < 992) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function (err) {
        alert('Could not calculate budget. Please check your input values.\n' + err.message);
      });
  });

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  resetBtn.addEventListener('click', function () {
    budgetForm.reset();
    placeholder.classList.remove('d-none');
    resultsEl.classList.add('d-none');
    if (donutChart) { donutChart.destroy(); donutChart = null; }
  });

}); // end DOMContentLoaded
