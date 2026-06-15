 // Initialize categories and values from table
        let categories = [];
        let data = [];
        document.querySelectorAll('.data-input').forEach((input) => {
            categories.push(input.dataset.category);
            data.push(parseFloat(input.value));
        });

        // Function to get chart height dynamically
        function getChartHeight() {
            if (window.innerWidth < 480) {
                return 250; // Small height for mobile
            } else if (window.innerWidth < 768) {
                return 350; // Medium height for tablets
            } else {
                return 500; // Large height for desktops
            }
        }

        // ApexCharts Options
        var options = {
            chart: {
                type: 'bar',
                height: getChartHeight(), // Dynamic height based on screen size
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        position: 'end',
                    },
                },
            },
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return val + '%';
                },
                style: {
                    fontSize: '14px',
                    colors: ['#000'],
                },
            },
            series: [{
                name: 'Raw Materials Cost',
                data: data,
            }],
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        fontSize: '12px',
                        colors: ['#000'],
                    },
                },
            },
            title: {
                text: 'Raw Materials Cost Allocation',
                align: 'center',
                style: {
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#000',
                },
            },
            responsive: [
                {
                    breakpoint: 768,
                    options: {
                        chart: {
                            height: 350, // Adjust chart height for tablets
                        },
                    },
                },
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            height: 250, // Adjust chart height for mobile
                        },
                    },
                },
            ],
        };

        // Render the chart
        var chart = new ApexCharts(document.querySelector("#barChart"), options);
        chart.render();

        // Update chart when table inputs change
        document.querySelectorAll('.data-input').forEach((input) => {
            input.addEventListener('input', () => {
                // Recalculate data
                let updatedData = [];
                document.querySelectorAll('.data-input').forEach((inp) => {
                    updatedData.push(parseFloat(inp.value) || 0); // Handle empty inputs
                });

                // Update the chart
                chart.updateSeries([{
                    data: updatedData,
                }]);
            });
        });

        // Recalculate chart size on window resize
        window.addEventListener('resize', () => {
            chart.updateOptions({
                chart: {
                    height: getChartHeight(),
                },
            });
        });