import React from 'react';

const EditConflictModal = ({ isOpen, onClose, conflictData, onMerge, onForceUpdate, onCancel }) => {
    if (!isOpen || !conflictData) return null;

    const { fieldDiffs = [], latestBook, currentVersion, newVersion } = conflictData;

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return '（空）';
        return String(value);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-amber-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">编辑冲突</h2>
                            <p className="text-sm text-amber-700 mt-0.5">
                                该图书已被其他用户修改，请确认如何处理
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-amber-800">版本信息</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-600">当前版本:</span>
                                <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{currentVersion}</span>
                            </div>
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <div className="flex items-center gap-2">
                                <span className="text-amber-600">最新版本:</span>
                                <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{newVersion}</span>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-4">差异对比</h3>

                    {fieldDiffs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>未检测到字段级差异</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fieldDiffs.map((diff, index) => (
                                <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <span className="font-medium text-gray-800">{diff.fieldLabel}</span>
                                        <span className="text-xs text-gray-500 ml-2">({diff.fieldName})</span>
                                    </div>
                                    <div className="grid grid-cols-3 divide-x divide-gray-200">
                                        <div className="p-4">
                                            <div className="text-xs text-gray-500 mb-2 font-medium">您的修改</div>
                                            <div className="text-sm text-gray-800 bg-blue-50 p-2 rounded border border-blue-100">
                                                {formatValue(diff.submittedValue)}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-xs text-gray-500 mb-2 font-medium">最新版本</div>
                                            <div className="text-sm text-gray-800 bg-orange-50 p-2 rounded border border-orange-100">
                                                {formatValue(diff.latestValue)}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-xs text-gray-500 mb-2 font-medium">操作</div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${diff.submittedValue !== diff.latestValue ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                                <span className={`text-xs ${diff.submittedValue !== diff.latestValue ? 'text-red-600' : 'text-green-600'}`}>
                                                    {diff.submittedValue !== diff.latestValue ? '存在冲突' : '一致'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">提示</p>
                                <p>选择「合并修改」将使用您修改的值覆盖冲突字段。选择「强制覆盖」将用您的版本完全覆盖最新版本。</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl font-medium transition-colors"
                    >
                        取消修改
                    </button>
                    <button
                        onClick={onMerge}
                        className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all"
                    >
                        合并修改
                    </button>
                    <button
                        onClick={onForceUpdate}
                        className="px-5 py-2.5 text-white bg-amber-600 hover:bg-amber-700 rounded-xl font-medium shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-all"
                    >
                        强制覆盖
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditConflictModal;
