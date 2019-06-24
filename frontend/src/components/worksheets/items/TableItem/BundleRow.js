import React, { Component } from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import Modal from '@material-ui/core/Modal';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

import DeleteIcon from '@material-ui/icons/Delete';
import UploadIcon from '@material-ui/icons/CloudUpload';
import AddIcon from '@material-ui/icons/PlayCircleFilled';

import * as Mousetrap from '../../../../util/ws_mousetrap_fork';
import BundleDetail from '../../BundleDetail';
import NewRun from '../../NewRun';
import NewUpload from '../../NewUpload';
import { buildTerminalCommand } from '../../../../util/worksheet_utils';
import { executeCommand } from '../../../../util/cli_utils';

// The approach taken in this design is to hack the HTML `Table` element by using one `TableBody` for each `BundleRow`.
// We need the various columns to be aligned for all `BundleRow` within a `Table`, therefore using `div` is not an
// option. Instead, we must make use of zero-height rows.

class InsertButtons extends Component<{
    classes: {},
    showNewUpload: () => void,
    showNewRun: () => void,
}> {
    render() {
        const { classes, showNewUpload, showNewRun } = this.props;
        return (
            <div
                onMouseMove={(ev) => {
                    ev.stopPropagation();
                }}
                className={classes.buttonsPanel}
            >
                <Button
                    key='upload'
                    variant='outlined'
                    size='small'
                    color='primary'
                    aria-label='New Upload'
                    onClick={() => showNewUpload()}
                    classes={{ root: classes.buttonRoot }}
                >
                    <UploadIcon className={classes.buttonIcon} />
                    Upload
                </Button>
                <Button
                    key='run'
                    variant='outlined'
                    size='small'
                    color='primary'
                    aria-label='New Run'
                    onClick={() => showNewRun()}
                    classes={{ root: classes.buttonRoot }}
                >
                    <AddIcon className={classes.buttonIcon} />
                    Run
                </Button>
            </div>
        );
    }
}

class BundleRow extends Component {
    state = {
        showDetail: false,
        showNewUpload: 0,
        showNewRun: 0,
        showInsertButtons: 0,
        bundleInfoUpdates: {},
        showDetail: false,
        openDelete: false,
        runProp: {},
    };

    receiveBundleInfoUpdates = (update) => {
        let { bundleInfoUpdates } = this.state;
        // Use object spread to update.
        bundleInfoUpdates = { ...bundleInfoUpdates, ...update };
        this.setState({ bundleInfoUpdates });
    };

    handleClick = () => {
        this.props.updateRowIndex(this.props.rowIndex);
        const { showDetail } = this.state;
        this.setState({
            showDetail: !showDetail,
        });
    };

    showNewUpload = (val) => () => {
        this.setState({ showNewUpload: val });
    };

    showNewRun = (val) => () => {
        this.setState({ showNewRun: val });
    };

    /**
     * Mouse listener triggered when hovering a row. It decides whether to show the buttons above or below the row,
     * based on the vertical position of where the user hovered.
     */
    showButtons = (ev) => {
        const { bundleInfo = {} } = this.props;
        const { sort_key, id } = bundleInfo;
        // If this bundle has no id nor sort_key, then it's not really a worksheet_item.
        // Don't show the insert buttons.
        if (sort_key === undefined && id === undefined) {
            return;
        }

        const row = ev.currentTarget;
        const { top, height } = row.getBoundingClientRect();
        const { clientY } = ev;
        const onTop = clientY >= top && clientY <= top + 0.25 * height;
        const onBotttom = clientY >= top + 0.75 * height && clientY <= top + height;
        if (onTop) {
            this.setState({
                showInsertButtons: -1,
            });
        }
        if (onBotttom) {
            this.setState({
                showInsertButtons: 1,
            });
        }
    };

    deleteItem = (ev) => {
        const { setFocus } = this.props;
        ev.stopPropagation();
        this.toggleDeletePopup();
        const { uuid } = this.props.bundleInfo;
        executeCommand(buildTerminalCommand(['rm', uuid])).done(() => {
            if (this.props.focused) {
                setFocus(-1, 0);
            }
            this.props.reloadWorksheet();
        });
    };

    toggleDeletePopup = () => {
        const { openDelete } = this.state;
        this.setState({
            openDelete: !openDelete,
        });
    }

    rerunItem = (runProp) => {
        this.setState({
            showDetail: false,
            showNewRun: 1,
            runProp: runProp,
        });
    }

    render() {
        const {
            showInsertButtons,
            showDetail,
            showNewUpload,
            showNewRun,
            bundleInfoUpdates,
            openDelete,
            runProp,
        } = this.state;
        const {
            classes,
            onMouseMove,
            bundleInfo,
            prevBundleInfo,
            item,
            worksheetUUID,
            reloadWorksheet,
            isLast,
        } = this.props;
        const rowItems = { ...item, ...bundleInfoUpdates };
        var baseUrl = this.props.url;
        var uuid = this.props.uuid;
        var columnWithHyperlinks = this.props.columnWithHyperlinks;
        var rowCells = this.props.headerItems.map(function(headerKey, col) {
            var rowContent = rowItems[headerKey];

            // See if there's a link
            var url;
            if (col == 0) {
                url = baseUrl;
            } else if (columnWithHyperlinks.indexOf(headerKey) != -1) {
                url = '/rest/bundles/' + uuid + '/contents/blob' + rowContent['path'];
                if ('text' in rowContent) {
                    rowContent = rowContent['text'];
                } else {
                    // In case text doesn't exist, content will default to basename of the path
                    // indexing 1 here since the path always starts with '/'
                    rowContent = rowContent['path'].split('/')[1];
                }
            }
            if (url)
                rowContent = (
                    <a href={url} className='bundle-link' target='_blank'>
                        {rowContent}
                    </a>
                );
            // else rowContent = rowContent + '';

            return (
                <TableCell
                    key={col}
                    classes={{
                        root: classes.root,
                    }}
                >
                    {rowContent}
                </TableCell>
            );
        });

         // Keyboard opening/closing
         if (this.props.focused) {
             Mousetrap.bind(['enter'], (e) => this.setState((state) => ({ showDetail: !state.showDetail })), 'keydown');
             Mousetrap.bind(['escape'], (e) => this.setState({ showDetail: false }), 'keydown');
         }


        return (
            <TableBody
                classes={{ root: classes.tableBody }}
                onMouseMove={this.showButtons}
                onMouseLeave={() => {
                    this.setState({
                        showInsertButtons: 0,
                    });
                }}
            >
                {/** ---------------------------------------------------------------------------------------------------
                  *  Insert Buttons (above)
                  */}
                <TableRow classes={{ root: classes.panelContainer }}>
                    <TableCell colSpan='100%' classes={{ root: classes.panelCellContainer }}>
                        {showInsertButtons < 0 && (
                            <InsertButtons
                                classes={classes}
                                showNewUpload={this.showNewUpload(-1)}
                                showNewRun={this.showNewRun(-1)}
                            />
                        )}
                    </TableCell>
                </TableRow>
                {/** ---------------------------------------------------------------------------------------------------
                  *  New Upload (above)
                  */}
                {showNewUpload === -1 && (
                    <TableRow classes={{ root: classes.panelContainer }}>
                        <TableCell colSpan='100%' classes={{ root: classes.panelCellContainer }}>
                            <NewUpload
                                after_sort_key={
                                    prevBundleInfo
                                        ? prevBundleInfo.sort_key
                                        : bundleInfo.sort_key - 10
                                }
                                worksheetUUID={worksheetUUID}
                                reloadWorksheet={reloadWorksheet}
                                onClose={() => {
                                    this.setState({ showNewUpload: 0 });
                                }}
                            />
                        </TableCell>
                    </TableRow>
                )}
                {/** ---------------------------------------------------------------------------------------------------
                  *  New Run (above)
                  */}
                {showNewRun === -1 && (
                    <TableRow>
                        <TableCell colSpan='100%' classes={{ root: classes.insertPanel }}>
                            <div className={classes.insertBox}>
                                <NewRun
                                    ws={this.props.ws}
                                    onSubmit={() => this.setState({ showNewRun: 0 })}
                                    after_sort_key={
                                        prevBundleInfo
                                            ? prevBundleInfo.sort_key
                                            : bundleInfo.sort_key - 10
                                    }
                                    reloadWorksheet={reloadWorksheet}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                )}
                {/** ---------------------------------------------------------------------------------------------------
                  *  Main Content
                  */}
                <TableRow
                    hover
                    onClick={this.handleClick}
                    onContextMenu={this.props.handleContextMenu.bind(
                        null,
                        bundleInfo.uuid,
                        this.props.focusIndex,
                        this.props.rowIndex,
                        bundleInfo.bundle_type === 'run',
                    )}
                    className={classNames({
                        [classes.contentRow]: true,
                        [classes.highlight]: this.props.focused,
                        [classes.cursor]: this.props.focused,
                        [classes.lowlight]: !this.props.focused && this.state.showDetail,
                    })}
                >
                    {rowCells}
                </TableRow>
                {/** ---------------------------------------------------------------------------------------------------
                  *  Deletion Modal (floating)
                  */}
                <TableRow classes={{ root: classes.panelContainer }}>
                    <TableCell colSpan='100%' classes={{ root: classes.panelCellContainer }}>
                        <div className={classes.rightButtonStripe}>
                            <IconButton
                                onClick={this.toggleDeletePopup}
                                classes={{ root: classes.iconButtonRoot }}
                            >
                                <DeleteIcon />
                            </IconButton>
                            <Modal
                                aria-labelledby="deletion-confirmation"
                                aria-describedby="deletion-confirmation"
                                open={openDelete}
                                onClose={this.toggleDeletePopup}
                            >
                                <Paper className={classes.modal}>
                                    <Typography variant="h6">
                                        Delete this bundle?
                                    </Typography>
                                    <div className={ classes.flexRow } >
                                        <Button variant='text' color='primary'
                                            onClick={ this.toggleDeletePopup }
                                        >
                                            Cancel
                                        </Button>
                                        &nbsp;&nbsp;
                                        <Button variant='contained' color='primary'
                                            onClick={ this.deleteItem }
                                        >
                                            Yes
                                        </Button>
                                    </div>
                                </Paper>
                            </Modal>
                        </div>
                    </TableCell>
                </TableRow>
                {/** ---------------------------------------------------------------------------------------------------
                  *  Bundle Detail (below)
                  */}
                {showDetail && (
                    <TableRow>
                        <TableCell colSpan='100%' classes={{ root: classNames({
                            [classes.rootNoPad]: true,
                            [classes.bundleDetail]: true,
                            [classes.highlight]: this.props.focused,
                            [classes.lowlight]: !this.props.focused,
                        })}}>
                            <BundleDetail
                                uuid={bundleInfo.uuid}
                                bundleMetadataChanged={this.props.reloadWorksheet}
                                ref='bundleDetail'
                                onUpdate={this.receiveBundleInfoUpdates}
                                onClose={() => {
                                    this.setState({
                                        showDetail: false,
                                    });
                                }}
                                rerunItem={ this.rerunItem }
                            />
                        </TableCell>
                    </TableRow>
                )}
                {/** ---------------------------------------------------------------------------------------------------
                  *  New Upload (below)
                  */}
                {showNewUpload === 1 && (
                    <TableRow classes={{ root: classes.panelContainer }}>
                        <TableCell colSpan='100%' classes={{ root: classes.panelCellContainer }}>
                            <NewUpload
                                after_sort_key={bundleInfo.sort_key}
                                worksheetUUID={worksheetUUID}
                                reloadWorksheet={reloadWorksheet}
                                onClose={() => this.setState({ showNewUpload: 0 })}
                            />
                        </TableCell>
                    </TableRow>
                )}
                {/** ---------------------------------------------------------------------------------------------------
                  *  New Run (below)
                  */}
                {showNewRun === 1 && (
                    <TableRow>
                        <TableCell colSpan='100%' classes={{ root: classes.insertPanel }}>
                            <div className={classes.insertBox}>
                                <NewRun
                                    ws={this.props.ws}
                                    onSubmit={() => this.setState({ showNewRun: 0 })}
                                    after_sort_key={bundleInfo.sort_key}
                                    reloadWorksheet={reloadWorksheet}
                                    defaultRun={ runProp }
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                )}
                {/** ---------------------------------------------------------------------------------------------------
                  *  Insert Buttons (below)
                  */}
                <TableRow classes={{ root: classes.panelContainer }}>
                    <TableCell colSpan='100%' classes={{ root: classes.panelCellContainer }}>
                        {(showInsertButtons > 0 && !isLast) && (
                            <InsertButtons
                                classes={classes}
                                showNewUpload={this.showNewUpload(1)}
                                showNewRun={this.showNewRun(1)}
                            />
                        )}
                    </TableCell>
                </TableRow>
            </TableBody>
        );
    }
}

const styles = (theme) => ({
    tableBody: {
        '&:hover $rightButtonStripe': {
            display: 'flex',
        },
    },
    panelContainer: {
        display: 'block',
        height: '0px !important',
        border: 'none !important',
        overflow: 'visible',
    },
    panelCellContainer: {
        padding: '0 !important',
        border: 'none !important',
        overflow: 'visible',
    },
    buttonsPanel: {
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        justifyContent: 'center',
        width: '100%',
        transform: 'translateY(-18px)',
    },
    rightButtonStripe: {
        display: 'none',
        flexDirection: 'row',
        position: 'absolute',
        justifyContent: 'center',
        left: '100%',
        transform: 'translateY(-100%) translateX(-100%)',
    },
    root: {
        verticalAlign: 'middle !important',
        border: 'none !important',
    },
    rootNoPad: {
        verticalAlign: 'middle !important',
        border: 'none !important',
        padding: '0px !important',
    },
    insertPanel: {
        verticalAlign: 'middle !important',
        padding: '32px 64px !important',
        backgroundColor: 'white',
        borderLeft: '4px solid white !important',  // Erase highlight border.
        borderRight: '4px solid white !important',  // Erase highlight border.
    },
    insertBox: {
        border: `2px solid ${theme.color.primary.base}`,
    },
    bundleDetail: {
        paddingLeft: `${theme.spacing.largest}px !important`,
        paddingRight: `${theme.spacing.largest}px !important`,
    },
    iconButtonRoot: {
        backgroundColor: theme.color.grey.lighter,
    },
    buttonRoot: {
        width: 120,
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        backgroundColor: '#f7f7f7',
        '&:hover': {
            backgroundColor: '#f7f7f7',
        },
    },
    buttonIcon: {
        marginRight: theme.spacing.large,
    },
    contentRow: {
        height: 36,
    },
    modal: {
        position: 'absolute',
        width: 300,
        top: '50vh',
        left: '50vw',
        padding: theme.spacing.larger,
        transform: 'translateY(-50%) translateX(-50%)',
    },
    flexRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    highlight: {
        backgroundColor: `${theme.color.primary.lightest} !important`,
    },
    lowlight: {
        backgroundColor: `${theme.color.grey.light} !important`,
    },
    cursor: {
        borderLeft: '#1d91c0 solid 3px',
    },
});

export default withStyles(styles)(BundleRow);