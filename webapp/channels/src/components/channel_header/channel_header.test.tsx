// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {ChannelType} from '@mattermost/types/channels';
import type {UserCustomStatus} from '@mattermost/types/users';

import {renderWithContext, screen} from 'tests/react_testing_utils';
import Constants, {RHSStates} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';

import ChannelHeader from './channel_header';

// Mock ChannelDecoratorRenderer so decorator tests don't need to bootstrap its Redux deps.
jest.mock('components/channel_decorator_renderer/channel_decorator_renderer', () => {
    return ({registration}: {registration: {id: string}}) => (
        <div data-testid={`decorator-${registration.id}`}/>
    );
});

// Mock useChannelDecorators so AfterNameDecorators can be controlled per test. The default of an
// empty array means pre-existing tests are unaffected (the slot renders nothing by default).
const mockUseChannelDecorators = jest.fn().mockReturnValue([]);
jest.mock('hooks/useChannelDecorators', () => ({
    useChannelDecorators: (...args: unknown[]) => mockUseChannelDecorators(...args),
}));

describe('components/ChannelHeader', () => {
    // Default: no after_channel_name decorators, so pre-existing tests are unaffected.
    beforeEach(() => {
        mockUseChannelDecorators.mockReturnValue([]);
    });

    const baseProps = {
        actions: {
            showPinnedPosts: jest.fn(),
            showChannelFiles: jest.fn(),
            closeRightHandSide: jest.fn(),
            getCustomEmojisInText: jest.fn(),
            updateChannelNotifyProps: jest.fn(),
            showChannelMembers: jest.fn(),
            fetchChannelRemotes: jest.fn(),
        },
        team: TestHelper.getTeamMock({id: 'team_id'}),
        channel: TestHelper.getChannelMock({}),
        channelMember: TestHelper.getChannelMembershipMock({}),
        currentUser: TestHelper.getUserMock({}),
        isCustomStatusEnabled: false,
        isCustomStatusExpired: false,
        isFileAttachmentsEnabled: true,
        lastActivityTimestamp: 1632146562846,
        isLastActiveEnabled: true,
        memberCount: 2,
        dmUser: undefined,
        gmMembers: undefined,
        rhsState: RHSStates.CHANNEL_INFO,
        isChannelMuted: false,
        hasGuests: false,
        pinnedPostsCount: 0,
        customStatus: undefined,
        timestampUnits: [
            'now',
            'minute',
            'hour',
        ],
        hideGuestTags: false,
        remoteNames: [],
        sharedChannelsPluginsEnabled: false,
        isChannelAutotranslated: false,
    };

    const populatedProps = {
        ...baseProps,
        channel: TestHelper.getChannelMock({
            id: 'channel_id',
            team_id: 'team_id',
            name: 'Test',
            delete_at: 0,
        }),
        channelMember: TestHelper.getChannelMembershipMock({
            channel_id: 'channel_id',
            user_id: 'user_id',
        }),
        currentUser: TestHelper.getUserMock({
            id: 'user_id',
            bot_description: 'the bot description',
        }),
    };

    test('should render properly when empty', () => {
        const {container} = renderWithContext(
            <ChannelHeader {...baseProps}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render properly when populated', () => {
        const {container} = renderWithContext(
            <ChannelHeader {...populatedProps}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render properly when populated with channel props', () => {
        const props = {
            ...baseProps,
            channel: TestHelper.getChannelMock({
                id: 'channel_id',
                team_id: 'team_id',
                name: 'Test',
                header: 'See ~test',
                props: {
                    channel_mentions: {
                        test: {
                            display_name: 'Test',
                        },
                    },
                },
            }),
            channelMember: TestHelper.getChannelMembershipMock({
                channel_id: 'channel_id',
                user_id: 'user_id',
            }),
            currentUser: TestHelper.getUserMock({
                id: 'user_id',
            }),
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render archived view', () => {
        const props = {
            ...populatedProps,
            channel: {...populatedProps.channel, delete_at: 1234},
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render shared view', () => {
        const props = {
            ...populatedProps,
            channel: TestHelper.getChannelMock({
                ...populatedProps.channel,
                shared: true,
                type: Constants.OPEN_CHANNEL as ChannelType,
            }),
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render correct menu when muted', () => {
        const props = {
            ...populatedProps,
            isChannelMuted: true,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should unmute the channel when mute icon is clicked', () => {
        const props = {
            ...populatedProps,
            isChannelMuted: true,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );

        const muteButton = container.querySelector('.channel-header__mute');
        expect(muteButton).not.toBeNull();
        (muteButton as HTMLElement).click();
        expect(props.actions.updateChannelNotifyProps).toHaveBeenCalledTimes(1);
        expect(props.actions.updateChannelNotifyProps).toHaveBeenCalledWith('user_id', 'channel_id', {mark_unread: 'all'});
    });

    test('should render active pinned posts', () => {
        const props = {
            ...populatedProps,
            rhsState: RHSStates.PIN,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render active channel files', () => {
        const props = {
            ...populatedProps,
            rhsState: RHSStates.CHANNEL_FILES,
            showChannelFilesButton: true,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render not active channel files', () => {
        const props = {
            ...populatedProps,
            rhsState: RHSStates.PIN,
            showChannelFilesButton: true,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render active flagged posts', () => {
        const props = {
            ...populatedProps,
            rhsState: RHSStates.FLAG,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render active mentions posts', () => {
        const props = {
            ...populatedProps,
            rhsState: RHSStates.MENTION,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render the pinned icon with the pinned posts count', () => {
        const props = {
            ...populatedProps,
            pinnedPostsCount: 2,
        };
        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render properly when custom status is set', () => {
        const props = {
            ...populatedProps,
            channel: TestHelper.getChannelMock({
                header: 'not the bot description',
                type: Constants.DM_CHANNEL as ChannelType,
                status: 'offline',
            }),
            dmUser: TestHelper.getUserMock({
                id: 'user_id',
                is_bot: false,
            }),
            isCustomStatusEnabled: true,
            customStatus: {
                emoji: 'calender',
                text: 'In a meeting',
            } as UserCustomStatus,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should render properly when custom status is expired', () => {
        const props = {
            ...populatedProps,
            channel: TestHelper.getChannelMock({
                header: 'not the bot description',
                type: Constants.DM_CHANNEL as ChannelType,
                status: 'offline',
            }),
            dmUser: TestHelper.getUserMock({
                id: 'user_id',
                is_bot: false,
            }),
            isCustomStatusEnabled: true,
            isCustomStatusExpired: true,
            customStatus: {
                emoji: 'calender',
                text: 'In a meeting',
            } as UserCustomStatus,
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should contain the channel info button', () => {
        const {container} = renderWithContext(
            <ChannelHeader {...populatedProps}/>,
        );

        // ChannelInfoButton renders a button with channel-info class
        const channelInfoButton = container.querySelector('.channel-header__info');
        expect(channelInfoButton).not.toBeNull();
    });

    test('should match snapshot with last active display', () => {
        const props = {
            ...populatedProps,
            channel: TestHelper.getChannelMock({
                header: 'not the bot description',
                type: Constants.DM_CHANNEL as ChannelType,
                status: 'offline',
            }),
            dmUser: TestHelper.getUserMock({
                id: 'user_id',
                is_bot: false,
                props: {
                    show_last_active: 'true',
                },
            }),
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    test('should match snapshot with no last active display because it is disabled', () => {
        const props = {
            ...populatedProps,
            isLastActiveEnabled: false,
            channel: TestHelper.getChannelMock({
                header: 'not the bot description',
                type: Constants.DM_CHANNEL as ChannelType,
                status: 'offline',
            }),
            dmUser: TestHelper.getUserMock({
                id: 'user_id',
                is_bot: false,
                props: {
                    show_last_active: 'false',
                },
            }),
        };

        const {container} = renderWithContext(
            <ChannelHeader {...props}/>,
        );
        expect(container).toMatchSnapshot();
    });

    describe('after_channel_name decorator slot', () => {
        // AfterNameDecorators renders as the first child of .channel-header__icons (before the
        // mute trigger and other icons), so decorators inherit the icon-group's even spacing.

        beforeEach(() => {
            mockUseChannelDecorators.mockReturnValue([]);
        });

        test('no decorators — slot renders nothing inside the icon group', () => {
            mockUseChannelDecorators.mockReturnValue([]);

            const {container} = renderWithContext(<ChannelHeader {...populatedProps}/>);

            const iconGroup = container.querySelector('.channel-header__icons');
            expect(iconGroup).not.toBeNull();
            expect(screen.queryByTestId(/^decorator-/)).not.toBeInTheDocument();
        });

        test('one matching decorator — it renders inside the icon group', () => {
            mockUseChannelDecorators.mockReturnValue([
                {id: 'dec-after-1', pluginId: 'test-plugin', component: () => null},
            ]);

            const {container} = renderWithContext(<ChannelHeader {...populatedProps}/>);

            const iconGroup = container.querySelector('.channel-header__icons');
            expect(iconGroup).not.toBeNull();
            expect(screen.getByTestId('decorator-dec-after-1')).toBeInTheDocument();
        });

        test('two matching decorators — both render inside the icon group in order', () => {
            mockUseChannelDecorators.mockReturnValue([
                {id: 'dec-after-1', pluginId: 'test-plugin', component: () => null},
                {id: 'dec-after-2', pluginId: 'test-plugin', component: () => null},
            ]);

            const {container} = renderWithContext(<ChannelHeader {...populatedProps}/>);

            const iconGroup = container.querySelector('.channel-header__icons');
            expect(iconGroup).not.toBeNull();
            const dec1 = screen.getByTestId('decorator-dec-after-1');
            const dec2 = screen.getByTestId('decorator-dec-after-2');
            expect(dec1).toBeInTheDocument();
            expect(dec2).toBeInTheDocument();
            // dec-after-1 must precede dec-after-2 in DOM order
            expect(dec1.compareDocumentPosition(dec2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        });

        test('decorator renders as first child of .channel-header__icons, before the mute trigger', () => {
            const mutedProps = {
                ...populatedProps,
                isChannelMuted: true,
            };
            mockUseChannelDecorators.mockReturnValue([
                {id: 'dec-after-1', pluginId: 'test-plugin', component: () => null},
            ]);

            const {container} = renderWithContext(<ChannelHeader {...mutedProps}/>);

            const iconGroup = container.querySelector('.channel-header__icons');
            expect(iconGroup).not.toBeNull();
            const dec = screen.getByTestId('decorator-dec-after-1');
            const muteButton = container.querySelector('#toggleMute');
            expect(dec).toBeInTheDocument();
            expect(muteButton).toBeInTheDocument();
            // decorator must come before the mute button in DOM order
            expect(dec.compareDocumentPosition(muteButton!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        });
    });
});
