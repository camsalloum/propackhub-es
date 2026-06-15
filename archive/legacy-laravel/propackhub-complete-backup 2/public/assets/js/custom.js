const ctx = document.getElementById('barChart').getContext('2d');

// Initial data
const labels = ['Solvent-Mix', 'LDPE White', 'Solvent Base', 'All Colors', 'PET Transparent'];
const data = [13.1, 50.9, 8.5, 15.5, 11.2];

// Create Chart
const barChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Cost Percentage',
            data: data,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
        }]
    },
    options: {
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true,
            }
        }
    }
});

// Update chart data on input change
document.querySelectorAll('.data-input').forEach((input, index) => {
    input.addEventListener('input', (event) => {
        barChart.data.datasets[0].data[index] = parseFloat(event.target.value) || 0;
        barChart.update();
    });
});