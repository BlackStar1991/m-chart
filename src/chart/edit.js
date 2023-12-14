import { TextControl, Spinner, ToolbarGroup, ToolbarButton, } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useBlockProps, BlockControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import "./editor.scss";
import debounce from 'lodash/debounce';
import { useCallback } from 'react';

export default function edit( { attributes, setAttributes } ) {

    // State.
    const [ options, setOptions ] = useState( [] );
    const [ search, setSearch ] = useState( '' );
    const [ maxAvailable, setMaxAvailable ] = useState( 0 );
    const [ available, setAvailable ] = useState( 0 );
    const [ loaded, setLoaded ] = useState( false );
    const [ charts, setCharts ] = useState( [] );
    const [ temp, setTemp ] = useState( null );
    const [ siteUrl, setSiteUrl ] = useState( null );
    const [ imageSupport, setImageSupport ] = useState( true );
    const [ loadProblem, setLoadProblem ] = useState( false );
    // Url constants.
    const newUrl = `${ siteUrl }/wp-admin/post-new.php?post_type=m-chart`;
    const editUrl = `${ siteUrl }/wp-admin/post.php?post=${ attributes.chartId }&action=edit`;
    const optionsUrl = `/m-chart/v1/options`;

    // Blockprops.
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );
    // Miscellaneous
    const random = `?random=${ Math.round( Math.random() * 1000000 ) }`;

    // On load we fetch all charts if none available we set a constant to show an error message.
    // We then check if a chart is already chosen. If so we show that one else show all.
    useEffect( () => {
        fetchOptions();
        fetchGraphs( search );
    }, [] );

    // Compose preview list.
    const optionsList = options.map( ( x ) => {
        if ( imageSupport ) {
            return <li className={ x.src ? 'img' : 'dashicons dashicons-chart-pie' } key={ x.id } onClick={ () => handleClick( x.id ) }>{ x.src ? <img src={ x.src + random } /> : <h6>{ x.title }</h6> }</li>;
        } else {
            return <li className={ x.type } key={ x.id } onClick={ () => handleClick( x.id ) }> { x.title }</li>;
        }
    } );

    const selected = charts.filter( x => x.id === attributes.chartId )[ 0 ];

    const handleClick = ( id ) => {
        setAttributes( { chartId: id } );
        setTemp( id );
    };

    const handleSearch = ( value ) => {
        const regex = /[^a-zA-Z0-9\- , ]/gi;
        value = value.replace( regex, '' );
        setSearch( value );
        doDebounce( value );
    };

    const fetchOptions = () => {
        apiFetch( { path: optionsUrl } ).then( result => {
            setImageSupport( result.image_support_active );
            setSiteUrl( result.siteurl );
            setMaxAvailable( result.maxAvailable );
        } );
    };

    const fetchGraphs = ( value ) => {
        setLoadProblem( false );
        apiFetch( { path: `/m-chart/v1/graphs/${ value }` } )
            .then(
                result => {
                    let charts = [];
                    setAvailable( result[ 0 ] );
                    result[ 1 ].map( x => charts.push( {
                        id: x.id,
                        title: x.title || '-',
                        subtitle: x.subtitle,
                        width: x.width,
                        height: x.height,
                        type: x.type || '',
                        src: x.url || ''
                    } ) );
                    setCharts( charts );
                    setOptions( charts );
                    setLoaded( true );
                } ).catch( ( error ) => {
                    if ( error.code === 'rest_no_route' ) {
                        setLoadProblem( true );
                    };
                } );
    };

    const doDebounce = useCallback( debounce( fetchGraphs, 500 ), [] );

    return (
        <div { ...blockProps }>
            <BlockControls>
                <ToolbarGroup className="m-chart-block">
                    <ToolbarButton onClick={ () => window.location.href = newUrl } icon="external">{ __( 'New Chart', 'm-chart' ) }</ToolbarButton>
                    { attributes.chartId &&
                        <>
                            <ToolbarButton onClick={ () => window.location.href = editUrl } icon="external" >{ __( 'Edit Chart', 'm-chart' ) }</ToolbarButton>
                            <ToolbarButton onClick={ () => handleClick( '' ) } >{ __( 'Replace', 'm-chart' ) }</ToolbarButton>
                        </>
                    }
                </ToolbarGroup>
            </BlockControls>

            <div className="wp-block m-chart-selector">
                <h6 className="branding"><span className="dashicons dashicons-chart-pie"></span>M Chart</h6>
                <div className="viewbox">
                    { loadProblem ?
                        <p>{ __( 'There is a problem fetching charts', 'm-chart' ) }</p>
                        :
                        <>
                            { !loaded ?
                                <p className="center">
                                    <Spinner />
                                </p>
                                :
                                attributes.chartId ?
                                    <div className="chart-selected">
                                        { imageSupport ?
                                            <div className="image-support">
                                                { selected?.src === '' ?
                                                    <h4 className="no-title dashicons-before dashicons-chart-pie">{ selected?.title }</h4>
                                                    :
                                                    <img className="preview" src={ selected?.src + random } />
                                                }
                                            </div>
                                            :
                                            <div className="no-image-support" style={ { aspectRatio: selected.width / selected.height } }>
                                                <span className={ 'type ' + selected.type }></span>
                                                <h4>{ selected?.title }</h4>
                                                <p>{ selected?.subtitle }</p>
                                            </div>
                                        }
                                    </div>
                                    :
                                    maxAvailable === 0 ?
                                        <p className="center">{ __( 'No Charts found', 'm-chart' ) }
                                            <a href={ newUrl }>{ __( 'Create a new chart', 'm-chart' ) }</a>
                                        </p>
                                        :
                                        <div className="no-chart-selected">
                                            <div className="search-box">
                                                <TextControl
                                                    value={ search }
                                                    placeholder={ __( 'Search by title', 'm-chart' ) }
                                                    onChange={ ( value ) => handleSearch( value ) }
                                                    autoFocus
                                                />
                                                <p>{ optionsList.length } { __( ' of ', 'm-chart' ) }{ available }</p>
                                            </div>
                                            { optionsList.length === 0 && search.length > 1 ?
                                                <p>{ __( 'No Charts found using this search string', 'm-chart' ) }</p>
                                                :
                                                <ul className={ imageSupport ? 'image-support' : 'no-image-support' }>
                                                    { optionsList }
                                                </ul>
                                            }
                                        </div>

                            }
                        </>
                    }
                </div>
            </div>
        </div >
    );
};;