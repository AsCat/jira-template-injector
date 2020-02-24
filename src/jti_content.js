/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

const StorageID = 'Jira-Template-Injector';
const inputIDs = [];
let labelObserver = null;
let selectedLabel = [];
let lastDescriptionElement = null;
let lastProcessTime = 0;
let clickTabTimeout = null;

const labelTips = '<div id="labelTips" class="description" style="color: #1222f7;">JIRA助手提示：推荐的标签为【QA测试】,【开发自测-不输出用例】，【开发自测-输出用例】，<br/>【开发自测-输出用例+自动化】，【专项测试】，【方案调研】，【临时任务】,【交付验收】这8种，不要忘记括号~</div>';
const emptyLabelTips = '<div id="emptyLabelTips" style="color:#fd0606;" class="description">这位同学，你确定不加个标签吗？</div>';

let browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1) {
    chrome = browser; // eslint-disable-line no-native-reassign
    chrome.storage.sync = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge';
    }
}

// Handle <TI> tag selection.
chrome.runtime.sendMessage({JDTIfunction: 'getInputIDs'}, function (response) {
    $.each(response.data, function (index, inputID) {
        inputIDs.push(inputID.name);
    });

    $(document).on('click', `#${inputIDs.join(', #')}`, function (inputID) {
        const text = $(this).val();
        let ctrlDown = false;
        const backtickKey = 192,
            ctrlKey = 17; // 17; 切换为left shit
        let cursorStart = $(this).prop('selectionStart'),
            cursorFinish = $(this).prop('selectionEnd');
        const end = (text.length - 5);
        let selectStart = null,
            selectEnd = null,
            i = 0;

        // Only proceed if this is a click. i.e. not a highlight.
        if (cursorStart === cursorFinish) {
            // Look for opening tag '<TI>'.
            for (i = cursorStart; i >= 4; i--) {
                if (i !== 4) {
                    if (text.slice((i - 5), i) === '</TI>') {
                        // Found closing tag before opening tag -> We are not withing any valid tags.
                        break;
                    }
                }
                if (text.slice((i - 4), i) === '<TI>') {
                    // Found opening Tag!
                    selectStart = (i - 4);
                    break;
                }
            }

            if (selectStart) {
                // Look for closing tag '</TI>'
                for (i = cursorStart; i <= end; i++) {
                    if (text.slice(i, (i + 4)) === '<TI>') {
                        // Found another opening bracket before closing bracket. Exit search.
                        break;
                    }
                    if (text.slice(i, (i + 5)) === '</TI>') {
                        // Found closing Tag!
                        selectEnd = (i + 5);
                        break;
                    }
                }
                if (selectEnd) {
                    // Select all the text between the two tags.
                    $(this)[0].setSelectionRange(selectStart, selectEnd);
                    cursorStart = cursorFinish = selectStart; // Set the cursor position to the select start point. This will ensure we find the next <TI> tag when using keyboard shortcut
                } else { // This only happens when user clicks on the the closing <TI> tag. Set selectStart to null so that it wont break the keyborad functionality
                    selectStart = null;
                }
            }
        }

        // Detect ctrl or cmd pressed
        $(`#${inputID.currentTarget.id}`).keydown(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = true;
        }).keyup(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = false;
        });

        // Keypress listener
        $(`#${inputID.currentTarget.id}`).keydown(function (e) {
            if (ctrlDown && (e.keyCode === backtickKey)) { // If ctrl is pressed
                // if (e.keyCode === 9) {
                let {start: tagStartIndex, end: tagEndIndex} = getAllIndexes($(this).val()); // Find all <TI> and </TI> tags in selected template.
                if (tagStartIndex.length !== 0 && tagEndIndex.length !== 0) { // Works only if the selected template contains any <TI> tag
                    if (selectStart === null && selectEnd === null) { // Start from first <TI>
                        var startPos = selectNextSelectionRange($(this)[0], cursorStart, tagStartIndex, tagEndIndex);
                        selectStart = startPos.start; // Set Start Index
                        selectEnd = startPos.end; // Set End Index
                    } else { // Select next <TI> set
                        if (tagStartIndex.indexOf(selectStart) === tagStartIndex.length - 1 && tagEndIndex.indexOf(selectEnd) === tagEndIndex.length - 1) { // Currently selecting the last set of <TI>, back to first set
                            $(this)[0].setSelectionRange(tagStartIndex[0], tagEndIndex[0]);
                            selectStart = tagStartIndex[0];
                            selectEnd = tagEndIndex[0];
                        } else {
                            if (tagStartIndex.indexOf(selectStart) === -1 && tagEndIndex.indexOf(selectEnd) === -1) { // Highlighted <TI> tag is modified by user. Now we need search for the next <TI>.
                                if (cursorStart < selectStart) cursorStart = selectStart;
                                startPos = selectNextSelectionRange($(this)[0], cursorStart, tagStartIndex, tagEndIndex);
                                selectStart = startPos.start; // Set Start Index
                                selectEnd = startPos.end; // Set End Index
                            } else {
                                $(this)[0].setSelectionRange(tagStartIndex[tagStartIndex.indexOf(selectStart) + 1], tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1]); // Find next set of <TI>
                                selectStart = tagStartIndex[tagStartIndex.indexOf(selectStart) + 1];
                                selectEnd = tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1];
                            }
                        }
                    }
                    cursorStart = cursorFinish = selectStart; // Set the cursor position to the select start point. This will ensure we find the next <TI> tag when using keyboard shortcut
                }
            }
        });
    });
});

function addLabTips () {
    if ($('#labelTips').length <= 0) {
        $('#labels').after(labelTips);
    }
}

function checkEmptyLabTips () {
    if (selectedLabel && checkEmptyLabTips.length > 0) {

    } else {

    }
}

function selectNextSelectionRange (selector, cursorStart, tagStartIndex, tagEndIndex) {
    const startPos = FindNextTI(cursorStart, tagStartIndex, tagEndIndex); // Find the starting <TI> tag
    selector.setSelectionRange(startPos.start, startPos.end);
    return startPos;
}

// Helper method. Find next <TI> based on cursor position
function FindNextTI (CursorPos, tagStart, tagEnd) {
    for (let i = 0; i < tagStart.length; i++) {
        if (tagStart[i] >= CursorPos) {
            return {start: tagStart[i], end: tagEnd[i]};
        }
    }
    return {start: tagStart[0], end: tagEnd[0]};
}

// Helper method. Find index(start and end) of all occurrences of a given substring in a string
function getAllIndexes (str) {
    const startIndexes = [],
        endIndexes = [];
    let re = /<TI>/g, // Start
        match = re.exec(str);
    while (match) {
        startIndexes.push(match.index);
        match = re.exec(str);
    }

    re = /<\/TI>/g; // End
    match = re.exec(str);
    while (match) {
        endIndexes.push(match.index + 5);
        match = re.exec(str);
    }
    return {start: startIndexes, end: endIndexes};
}

function getAllSelectedLabels (element) {
    const jelm = $(element.target);
    selectedLabel = [];
    jelm.find('.value-text').each(function (index, value) {
        let text = value.innerText;
        // if (labels.indexOf(text) >= 0) {
        selectedLabel.push(text);
        // }
    });
    // console.log('--------------- getAllSelectedLabels !!!');

    let nowTime = new Date().getTime();
    if (nowTime - lastProcessTime < 1000) {
        return;
    }
    lastProcessTime = nowTime;

    // console.log('--------------- injectDescriptionTemplate WHEN TAG CHANGED !!!');
    injectDescriptionTemplate(lastDescriptionElement);
}

function isDefaultDescription (value, callback) {
    // 强制都会刷新
    if (new Date().getTime() > 0) {
        callback(true);
    }
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;
        let match = false;

        // Check if it's empty.
        if (value === '') {
            match = true;
        }

        // Check if we've already loaded a template.
        if (!match) {
            $.each(templates, function (key, template) {
                if (value === template.text) {
                    match = true;
                    return false;
                }
            });
        }

        callback(match);
    });
}

// Given the project name as formatted in JIRA's dropdown "PROJECT (KEY)", parse out the key
function parseProjectKey (projectElement) {
    const project = projectElement.val();
    return project.substring(project.lastIndexOf('(') + 1, project.length - 1);
}

function isInArrayListContext (text, array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].indexOf(text) >= 0) {
            return true;
        }
    }
    return false;
}

function addExtracted (template, templateText) {
    // 添加额外的信息
    let extraText = template['extra-text'];
    // console.log(templateText);
    // console.log('ddddddddddddddd');
    // console.log(extraText);
    let labelIsEmpty = true;
    if (extraText) {
        for (let i = 0; i < extraText.length; i++) {
            if (isInArrayListContext(extraText[i].label, selectedLabel)) {
                // templateText += ('\n\n' + extraText[i].text);
                templateText = extraText[i].text;
                labelIsEmpty = false;
            }
        }
    }
    if (labelIsEmpty) {
        if ($('#emptyLabelTips').length <= 0) {
            $('.buttons-container.form-footer').append(emptyLabelTips);
        }
    } else {
        $('#emptyLabelTips').remove();
    }
    return templateText;
}

function injectDescriptionTemplate (descriptionElement) {
    addLabTips();
    checkEmptyLabTips();
    // console.log(descriptionElement)
    lastDescriptionElement = descriptionElement;
    // console.log('--------------------- injectDescriptionTemplate');

    // Each issue type for each project can have its own template.
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;
        let templateText = '';
        const projectElement = $('#project-field'),
            issueTypeElement = $('#issuetype-field');

        if (issueTypeElement !== null && projectElement !== null) {
            const projectKey = parseProjectKey(projectElement);
            let override = 0;

            for (const key in templates) {
                let template = templates[key];
                // Default template (no issue type, no project)
                if (!template['issuetype-field'] && !template['projects-field']) {
                    if (override < 1) {
                        override = 1;
                        templateText = template.text;
                        templateText = addExtracted(template, templateText);
                        break;
                    }
                    // Override if project, no issue type
                } else if (!template['issuetype-field'] && $.inArray(projectKey, utils.parseProjects(template['projects-field'])) !== -1) {
                    if (override < 2) {
                        override = 2;
                        templateText = template.text;
                        templateText = addExtracted(template, templateText);
                        break;
                    }
                    // Override if issue type, no project
                } else if (!template['projects-field'] && template['issuetype-field'] === issueTypeElement.val()) {
                    if (override < 3) {
                        override = 3;
                        templateText = template.text;
                        templateText = addExtracted(template, templateText);
                        break;
                    }
                    // Override if issue type and project
                } else if (template['issuetype-field'] === issueTypeElement.val() &&
                    $.inArray(projectKey, utils.parseProjects(template['projects-field'])) !== -1) {
                    templateText = template.text;
                    templateText = addExtracted(template, templateText);
                    // return false;
                    break;
                }
            }
            // $.each(templates, function (key, template) {
            //
            // });
            descriptionElement.value = templateText;
        } else {
            if (issueTypeElement === null) {
                console.error('*** Error: Element Id "issuetype-field" not found.');
            } else if (projectElement === null) {
                console.error('*** Error: Element Id "project-field" not found.');
            }
        }
    });
}

function descriptionChangeEvent (changeEvent) {
    // The description field has been changed, turn the dirtyDialogMessage back on and remove the listener.
    changeEvent.target.className = changeEvent.target.className.replace(' ajs-dirty-warning-exempt', '');
    changeEvent.target.removeEventListener('change', descriptionChangeEvent);
}

function eventFire (el, etype) {
    if (el.fireEvent) {
        el.fireEvent('on' + etype);
    } else {
        const evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
    }
}

function clickIfNotInTextMode () {
    // console.log('-------------1 clickIfNotInTextMode');
    let sourceTabElement = $('*[data-mode="source"]');
    if (sourceTabElement && sourceTabElement.length > 0) {
        let liId = sourceTabElement.children('a').attr('id');
        // console.log(liId);
        // console.log('-------------2 clickIfNotInTextMode');
        const selected = $('#' + liId).attr('aria-selected');
        if (selected === 'false') {
            // console.log('------clickIfNotInTextMode');
            if (clickTabTimeout) {
                clearTimeout(clickTabTimeout);
            }
            clickTabTimeout = setTimeout(function () {
                // console.log('clicked');
                eventFire(document.getElementById(liId), 'click');
                const desc = document.getElementById('description');
                injectDescriptionTemplate(desc);

                listenForTagChanged();
            }, 500);
        }
    }
}

function listenForTagChanged () {
    if (!labelObserver && $('#labels-multi-select [role="listbox"]').length > 0) {
        // console.log('00000000000000');
        labelObserver = new MutationObserver(function (mutations) {
            mutations.forEach(getAllSelectedLabels);
        });
        const config = {attributes: false, childList: true, subtree: false};
        labelObserver.observe($('#labels-multi-select [role="listbox"]')[0], config);
    }
}

function observeDocumentBody (mutation) {
    // console.log('observeDocumentBody');
    labelObserver = null;

    // console.log(mutation)
    if (document.getElementById('create-issue-dialog') !== null || document.getElementById('create-subtask-dialog') !== null) {
        clickIfNotInTextMode();
        // Only interested in document changes related to Create Issue Dialog box or Create Sub-task Dialog box.
        if (inputIDs.includes(mutation.target.id)) { // Only interested in select input id fields.
            const descriptionElement = mutation.target;
            // console.log(mutation.target);
            isDefaultDescription(descriptionElement.value, function (result) {
                // console.log('-=---------- isDefaultDescription');
                if (result) {
                    // Only inject if description field has not been modified by the user.
                    // console.log('--------------------- isDefaultDescription  = true');

                    let nowTime = new Date().getTime();
                    if (nowTime - lastProcessTime < 1000) {
                        return;
                    }
                    lastProcessTime = nowTime;
                    // console.log('--------------- injectDescriptionTemplate 22222222222222');

                    injectDescriptionTemplate(descriptionElement);
                    if (descriptionElement.className.indexOf('ajs-dirty-warning-exempt') === -1) { // Default template injection should not pop up dirtyDialogMessage.
                        descriptionElement.className += ' ajs-dirty-warning-exempt';
                        descriptionElement.addEventListener('change', descriptionChangeEvent);
                    }
                }
            });

            listenForTagChanged();
        }
    }
}

// Create observer to monitor for description field if the domain is a monitored one
chrome.runtime.sendMessage({JDTIfunction: 'getDomains'}, function (response) {
    $.each(response.data, function (index, domain) {
        const pattern = new RegExp(domain.name);
        if (pattern.test(window.location.href)) {
            // console.log('--------------------- test url = true');
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(observeDocumentBody);
            });
            observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['resolved']});
        }
    });
});
