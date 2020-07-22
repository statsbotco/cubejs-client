import React, { useState, useEffect } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default ({ categories, data }) => {
  const [options, setOptions] = useState({});
  useEffect(() => {
    setOptions({
      chart: {
        type: 'column',
        styledMode: true,
        spacingRight: 25,
        spacingLeft: 20,
      },
      credits: {
        enabled: false,
      },
      title: {
        text:
          'Categories sales<small>Highcharts API, Stacked column Chart</small>',
        useHTML: true,
      },
      xAxis: {
        categories: categories,
      },
      yAxis: {
        title: {
          enabled: false,
        },
        gridLineColor: '#D0D0DA30',
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'normal',
            color:
              (Highcharts.defaultOptions.title.style &&
                Highcharts.defaultOptions.title.style.color) ||
              'gray',
          },
        },
      },
      colors: [
        '#45446F',
        '#BE3D7F',
        '#FF6492',
        '#FF93A8',
        '#FFC3BA',
        '#FFEAE4',
        '#DFD7FF',
        '#B5ACFF',
        '#7A77FF',
        '#5251C9',
      ],
      legend: {
        align: 'center',
        width: '90%',
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}',
      },
      plotOptions: {
        column: {
          stacking: 'normal',
        },
      },
      series: data,
    });
  }, [data, categories]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};
