import React from 'react';

const numColor = 'rgb(255, 170, 170)';
const numTip = 6;
export const Num = ({ n, small }: { n: number; small?: boolean }) => (
    <span
        style={
            small
                ? {
                      // backgroundColor: '#faa',
                      // color: 'black',
                      // fontFamily: 'Lora',
                      // fontSize: 8,
                      // width: 10,
                      // marginLeft: -10,
                      // marginTop: -10,
                      backgroundColor: numColor,
                      // textShadow: `1px 1px 2px ${numColor}, -1px -1px 2px ${numColor}, 1px -1px 2px ${numColor}, -1px 1px 2px ${numColor}`,
                      color: 'black',
                      fontWeight: 'bold',
                      fontFamily: 'Lora',
                      // fontSize: '8px',
                      width: '12px',
                      marginLeft: '-12px',
                      lineHeight: '8px',
                      display: 'inline-block',
                      position: 'absolute',
                      top: '-10px',
                      textAlign: 'center',
                      borderRadius: 2,
                      left: '2px',
                  }
                : {
                      padding: '0px 6px',
                      backgroundColor: '#faa',
                      color: 'black',
                      fontFamily: 'Lora',
                      fontWeight: 'bold',
                      // fontSize: 12,
                      borderRadius: '50%',
                      marginRight: 8,
                      // display: 'inline-block',
                  }
        }
    >
        {n}
        <span
            style={{
                position: 'absolute',
                bottom: -numTip / 2,
                left: '50%',
                marginLeft: -numTip / 2,
                width: '0',
                height: '0',
                borderLeft: `${numTip / 2}px solid transparent`,
                borderRight: `${numTip / 2}px solid transparent`,
                borderTop: `${numTip / 2}px solid ${numColor}`,
            }}
        ></span>
    </span>
);
