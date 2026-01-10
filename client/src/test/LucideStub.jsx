
import React from 'react';

// Simplified Lucide Mock
export const Music = (props) => React.createElement('span', props, 'Music');
export const Disc = (props) => React.createElement('span', props, 'Disc');
export const ListMusic = (props) => React.createElement('span', props, 'ListMusic');
export const Search = (props) => React.createElement('span', props, 'Search');
export const Upload = (props) => React.createElement('span', props, 'Upload');
export const RefreshCw = (props) => React.createElement('span', props, 'RefreshCw');
export const ArrowRight = (props) => React.createElement('span', props, 'ArrowRight');
export const Sparkles = (props) => React.createElement('span', props, 'Sparkles');
export const User = (props) => React.createElement('span', props, 'User');
export const Play = (props) => React.createElement('span', props, 'Play');
export const FolderOpen = (props) => React.createElement('span', props, 'FolderOpen');
export const Heart = (props) => React.createElement('span', props, 'Heart');
export const Pause = (props) => React.createElement('span', props, 'Pause');
export const SkipForward = (props) => React.createElement('span', props, 'SkipForward');
export const SkipBack = (props) => React.createElement('span', props, 'SkipBack');
export const Trash2 = (props) => React.createElement('span', props, 'Trash2');
export const X = (props) => React.createElement('span', props, 'X');
export const HardDrive = (props) => React.createElement('span', props, 'HardDrive');
export const AlertCircle = (props) => React.createElement('span', props, 'AlertCircle');
export const LogOut = (props) => React.createElement('span', props, 'LogOut');
export const Pencil = (props) => React.createElement('span', props, 'Pencil');
export const ThumbsUp = (props) => React.createElement('span', props, 'ThumbsUp');
export const ThumbsDown = (props) => React.createElement('span', props, 'ThumbsDown');
export const Monitor = (props) => React.createElement('span', props, 'Monitor');
export const Settings = (props) => React.createElement('span', props, 'Settings');
export const Smartphone = (props) => React.createElement('span', props, 'Smartphone');
export const Laptop = (props) => React.createElement('span', props, 'Laptop');
export const Speaker = (props) => React.createElement('span', props, 'Speaker');
export const CheckCircle2 = (props) => React.createElement('span', props, 'CheckCircle2');
export const Volume2 = (props) => React.createElement('span', props, 'Volume2');
export const VolumeX = (props) => React.createElement('span', props, 'VolumeX');
export const Shuffle = (props) => React.createElement('span', props, 'Shuffle');
export const Repeat = (props) => React.createElement('span', props, 'Repeat');
export const Repeat1 = (props) => React.createElement('span', props, 'Repeat1');
export const List = (props) => React.createElement('span', props, 'List');
export const ChevronDown = (props) => React.createElement('span', props, 'ChevronDown');

// Proxy for any missing icons
export default new Proxy({}, {
    get: (target, prop) => {
        return (props) => React.createElement('span', props, String(prop));
    }
});
