import React, { useState, useEffect } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import highchartsMap from 'highcharts/modules/map';
import mapDataIE from '@highcharts/map-collection/countries/us/us-all.geo.json';
highchartsMap(Highcharts);

export default ({ data, setRegion }) => {
  const [options, setOptions] = useState({});
  useEffect(() => {
    setOptions({
      chart: {
        map: 'countries/us/custom/us-all-mainland',
        styledMode: true,
      },
      credits: {
        enabled: false,
      },
      title: {
        text: 'Orders by region<small>Highcharts Map API</small>',
        useHTML: true,
      },
      colorAxis: {
        min: 0,
      },
      tooltip: {
        headerFormat: '',
        pointFormat: `
          <b>{point.name}</b>: {point.value}`,
      },
      colorAxis: {
        minColor: '#FFEAE4',
        maxColor: '#FF6492',
      },
      series: [
        {
          name: 'Basemap',
          mapData: mapDataIE,
          data: data,
          borderColor: '#FFC3BA',
          borderWidth: 0.5,
          nullColor: '#FFEAE4',
          showInLegend: false,
          allowPointSelect: true,
          dataLabels: {
            enabled: true,
            format: '{point.name}',
            color: '#000',
          },
          states: {
            select: {
              borderColor: '#B5ACFF',
              color: '#7A77FF',
            },
          },
          point: {
            events: {
              click: function () {
                setRegion(this['hc-key']);
              },
            },
          },
        },
      ],
    });
  }, [data]);
  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType={'mapChart'}
      options={options}
    />
  );
};
