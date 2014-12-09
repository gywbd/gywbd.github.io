(function($,window,MediumEditor){
    var ERROR_MESSAGES = {
        'err-title-empty' : 'Title is required',
        'err-url-empty' : 'Url is required, it is combined with latters,numbers,underscore and dash',
        'err-url-illegal' : 'Url is required, it is combined with latters,numbers,underscore and dash',
        'err-url-exists' : 'Url is duplicated',
        'err-content-empty' : 'Content cannot be empty'
    };

    var POST_STATUS_PUBLISHED = 1;
    var POST_STATUS_NOT_PUBLISHED = 2;
    var POST_STATUS_REMOVED = 3;

    var POST_OPT_SAVE = 0;
    var POST_OPT_SAVE_AND_PUBLISH = 1;
    var POST_OPT_REMOVE = 2;
    var POST_OPT_DELETE = 3;
    var POST_OPT_RESTORE = 4;
    var POST_OPT_AUTO_SAVE = 5;

    var operate_buttons = {
        'list' : $('<a href="/">文章列表</a>'),
        'remove'  : $('<a href="javascript:void(0);" id="remove">删除</a>'),
        'save'  : $('<a href="javascript:void(0);" id="save">仅保存</a>'),
        'save_and_publish'  : $('<a href="javascript:void(0);" id="save-and-publish">保存并发布</a>'),
        'delete'  : $('<a href="javascript:void(0);" id="delete">彻底删除</a>'),
        'restore'  : $('<a href="javascript:void(0);" id="restore">恢复</a>'),
    };


    $(function(){
        var post_id = $('#post-id').val();
        var post_status = $('#post-status').val() ? parseInt($('#post-status').val()) : 0;

        var editors = {
            url : new MediumEditor('.url-editor',{placeholder:"Url",disableToolbar:true,disableReturn:true,disableEditing:post_status === POST_STATUS_REMOVED}),
            title : new MediumEditor('.title-editor',{placeholder:"Title",disableToolbar:true,disableReturn:true,disableEditing:post_status === POST_STATUS_REMOVED}),
            keywords : new MediumEditor('.keywords-editor',{placeholder:"Keywords",disableToolbar:true,disableReturn:true,disableEditing:post_status === POST_STATUS_REMOVED}),
            desc : new MediumEditor('.desc-editor',{placeholder:"Description",disableToolbar:true,disableReturn:true,disableEditing:post_status === POST_STATUS_REMOVED}),
            content : new MediumEditor('.content-editor',{placeholder:"Content",buttons:['bold', 'italic', 'underline', 'anchor', 'header1', 'header2', 'quote','pre','orderedlist','unorderedlist','strikethrough'],targetBlank:true,disableEditing:post_status === POST_STATUS_REMOVED,firstHeader:'h2',secondHeader:'h3'}),
            getValue : function(editorType) {
                var _this = this,
                    result = {},
                    key,
                    c;
                if(!editorType) {
                    for(key in this) {
                        if(key !== 'getValue') {
                            c = this[key].serialize();
                            result[key] = c['element-0'].value;
                        }
                    }
                    return result;
                }

               if($.isArray(editorType)) {
                    editorType.forEach(function(item){
                        if(_this[item]) {
                            c = _this[item].serialize();
                            result[key] = c['element-0'].value;
                        }
                    });
                    return result;
                }

                if(this[editorType]) {
                    c = this[editorType].serialize();
                    return c['element-0'].value;
                }

                return '';
            }
        };

        var oldEditorsContent = editors.getValue();

        var doms = {
            operate_buttons : $('#operate-btns'),
            msg : $('#msg')
        };

        if(doms.msg.html()) {
            setTimeout(function(){
                doms.msg.empty();
            },10 * 1000);
        }


        function showMsg(content,cssClass,delay) {
            doms.msg.empty().append('<span class="'+cssClass+'">'+content+'</span>');
            if(delay > 0) {
                setTimeout(function(){
                    doms.msg.empty();
                },delay * 1000);
            }
        }

        function make_operate_buttons(buttons) {
            if(buttons) {
                buttons.forEach(function(item){
                    doms.operate_buttons.append(operate_buttons[item]);
                });
            }
        }

        if(!post_id) {
            make_operate_buttons(['list','save','save_and_publish']);
        }else if(post_status === POST_STATUS_PUBLISHED || post_status === POST_STATUS_NOT_PUBLISHED){
            make_operate_buttons(['list','remove','save','save_and_publish']);
        }else if(post_status === POST_STATUS_REMOVED){
            make_operate_buttons(['list','delete','restore']);
        }

        $("#choose-post").bind('change',function(){
            var v = $(this).val();
            var s = v ? "?id=" + v : '';
            window.location.href = '/admin' + s;
        });

        function operate_post(type){
            $.post(
                '/operate',
                {
                    type:type,
                    id : post_id
                },
                function(result){
                    if(result.code === 'fail') {
                        window.alert('Wrong Operation or the post did not exist');
                        window.location.href = "/admin";
                    }else if(result.code === 'success'){
                        window.alert('Success!');

                        if(type === POST_OPT_DELETE) {
                            window.location.href = "/admin";
                        }else {
                            window.location.href = "/admin?id=" + post_id;
                        }
                    }

                },
                'json'
            );
        }

        $.each({
            remove : POST_OPT_REMOVE,
            restore : POST_OPT_RESTORE,
            "delete" : POST_OPT_DELETE
        },function(id,type){
            $('#' + id).bind('click',function(){
                operate_post(type);
            });
        });


        var save = function(type,callback) {
            var editorContent = editors.getValue();

            return $.post(
                "/save",
                $.extend({id:post_id,type:type},editorContent),
                callback,
                'json'
            );
        };


        $('#save').bind('click',function(){
            save(POST_OPT_SAVE,function(result) {
                if(result.code === 'success') {
                    window.location.href = '/admin?id=' + result.data.id;
                }else {
                    window.alert(ERROR_MESSAGES[result.code]);
                }
            });
        });

        $('#save-and-publish').bind('click',function(){
            save(POST_OPT_SAVE_AND_PUBLISH,function(result) {
                if(result.code === 'success') {
                    window.location.href = '/admin?id=' + result.data.id;
                }else {
                    window.alert(ERROR_MESSAGES[result.code]);
                }
            });
        });

        //auto save as draft
        setInterval(function(){
            var newEditorsContent = editors.getValue();

            var changed = false;

            $.each(oldEditorsContent,function(key,value){
                if(value !== newEditorsContent[key]) {
                    changed = true;
                }
            });

            if(changed) {
                oldEditorsContent = newEditorsContent;

                save(POST_OPT_AUTO_SAVE,function(result){
                    console.log(result);
                    if(result.code === 'success') {
                        showMsg('已成功自动保存...','waring',3);
                    }else {
                        showMsg('无法自动保存','error',3);
                    }
                });
            }

            },10*1000);

    });
}(jQuery,window,MediumEditor));

